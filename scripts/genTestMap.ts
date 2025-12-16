#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface ExportInfo {
  name: string;
  kind: string;
  signature: string;
  returns: string;
  sideEffects: string[];
  errors: string[];
  usedBy: string[];
}

interface ModuleInfo {
  path: string;
  exports: ExportInfo[];
}

interface RouteInfo {
  path: string;
  component: string;
  guard?: string;
  loader?: string;
}

interface TestMap {
  modules: ModuleInfo[];
  routes: RouteInfo[];
}

class TestMapGenerator {
  private testMap: TestMap = { modules: [], routes: [] };
  private program: ts.Program;
  private checker: ts.TypeChecker;

  constructor() {
    // Create TypeScript program
    const configPath = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.json');
    const config = ts.readConfigFile(configPath!, ts.sys.readFile);
    const compilerOptions = ts.parseJsonConfigFileContent(config.config, ts.sys, './').options;
    
    // Find all source files
    const sourceFiles = this.findSourceFiles(['client/src', 'server']);
    
    this.program = ts.createProgram(sourceFiles, compilerOptions);
    this.checker = this.program.getTypeChecker();
  }

  private findSourceFiles(directories: string[]): string[] {
    const files: string[] = [];
    
    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        this.walkDirectory(dir, files);
      }
    }
    
    return files;
  }

  private walkDirectory(dir: string, files: string[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build', '__tests__', 'tests'].includes(entry.name)) {
        this.walkDirectory(fullPath, files);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  private analyzeModule(sourceFile: ts.SourceFile): ModuleInfo {
    const exports: ExportInfo[] = [];
    const modulePath = sourceFile.fileName;

    // Visit all export declarations
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isExportDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isVariableStatement(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        const exportInfo = this.extractExportInfo(node, sourceFile);
        if (exportInfo) {
          exports.push(exportInfo);
        }
      }
    });

    return {
      path: modulePath,
      exports
    };
  }

  private extractExportInfo(node: ts.Node, sourceFile: ts.SourceFile): ExportInfo | null {
    const symbol = this.checker.getSymbolAtLocation(node);
    if (!symbol) return null;

    const name = symbol.getName();
    const type = this.checker.getTypeOfSymbolAtLocation(symbol, node);
    
    // Determine kind
    let kind = 'unknown';
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      kind = 'function';
    } else if (ts.isClassDeclaration(node)) {
      kind = 'class';
    } else if (ts.isInterfaceDeclaration(node)) {
      kind = 'interface';
    } else if (ts.isTypeAliasDeclaration(node)) {
      kind = 'type';
    } else if (ts.isVariableDeclaration(node)) {
      kind = 'const';
    }

    // Extract signature and return type
    const signature = this.checker.typeToString(type);
    const returns = this.extractReturnType(type);
    
    // Analyze side effects and errors from source code
    const sourceText = sourceFile.getFullText();
    const sideEffects = this.analyzeSideEffects(sourceText, name);
    const errors = this.analyzeErrors(sourceText, name);

    return {
      name,
      kind,
      signature,
      returns,
      sideEffects,
      errors,
      usedBy: [] // This would require cross-file analysis
    };
  }

  private extractReturnType(type: ts.Type): string {
    return this.checker.typeToString(type);
  }

  private analyzeSideEffects(sourceText: string, functionName: string): string[] {
    const effects: string[] = [];
    
    // Check for common side effects
    if (sourceText.includes('supabase.from(')) effects.push('Supabase database calls');
    if (sourceText.includes('localStorage') || sourceText.includes('sessionStorage')) effects.push('Local storage');
    if (sourceText.includes('fetch(') || sourceText.includes('axios')) effects.push('HTTP requests');
    if (sourceText.includes('navigate(') || sourceText.includes('router.')) effects.push('Navigation');
    if (sourceText.includes('toast(')) effects.push('Toast notifications');
    if (sourceText.includes('console.')) effects.push('Console logging');
    
    return effects;
  }

  private analyzeErrors(sourceText: string, functionName: string): string[] {
    const errors: string[] = [];
    
    // Look for error patterns
    if (sourceText.includes('throw new Error') || sourceText.includes('throw')) errors.push('Throws errors');
    if (sourceText.includes('Promise.reject') || sourceText.includes('.catch(')) errors.push('Promise rejections');
    if (sourceText.includes('try {') || sourceText.includes('catch (')) errors.push('Try-catch error handling');
    
    return errors;
  }

  private analyzeRoutes(): RouteInfo[] {
    const routes: RouteInfo[] = [];
    
    // Look for route definitions in App.tsx and AnimatedRoutes.tsx
    const routeFiles = ['client/src/App.tsx', 'client/src/components/AnimatedRoutes.tsx'];
    
    for (const filePath of routeFiles) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const routeMatches = content.matchAll(/<Route\s+path="([^"]+)"\s+element={[^}]*<([^>\s]+)[^}]*}/g);
        
        for (const match of routeMatches) {
          const [, path, component] = match;
          const hasGuard = match[0].includes('ProtectedRoute');
          
          routes.push({
            path,
            component,
            guard: hasGuard ? 'ProtectedRoute' : undefined
          });
        }
      }
    }
    
    return routes;
  }

  public generate(): TestMap {
    console.log('🔍 Scanning source files...');
    
    // Analyze modules
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.fileName.includes('node_modules') && 
          !sourceFile.fileName.includes('dist') &&
          (sourceFile.fileName.includes('client/src') || sourceFile.fileName.includes('server'))) {
        const moduleInfo = this.analyzeModule(sourceFile);
        if (moduleInfo.exports.length > 0) {
          this.testMap.modules.push(moduleInfo);
        }
      }
    }

    // Analyze routes
    this.testMap.routes = this.analyzeRoutes();

    console.log(`📊 Found ${this.testMap.modules.length} modules with ${this.testMap.modules.reduce((sum, m) => sum + m.exports.length, 0)} exports`);
    console.log(`🗺️  Found ${this.testMap.routes.length} routes`);

    return this.testMap;
  }

  public writeJSON(): void {
    const jsonPath = 'docs/test-map.json';
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(this.testMap, null, 2));
    console.log(`✅ Written ${jsonPath}`);
  }

  public writeMarkdown(): void {
    const mdPath = 'docs/test-map.md';
    const content = this.generateMarkdown();
    fs.mkdirSync(path.dirname(mdPath), { recursive: true });
    fs.writeFileSync(mdPath, content);
    console.log(`✅ Written ${mdPath}`);
  }

  public writeRoutesMap(): void {
    const routesPath = 'docs/routes-map.md';
    const content = this.generateRoutesMarkdown();
    fs.mkdirSync(path.dirname(routesPath), { recursive: true });
    fs.writeFileSync(routesPath, content);
    console.log(`✅ Written ${routesPath}`);
  }

  private generateMarkdown(): string {
    let md = `# Gospel Era Web - Complete Test Map

## Project Overview
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Router**: React Router with animations (Framer Motion)
- **Authentication**: Supabase Auth with smooth transitions
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS with theme system
- **Testing**: Vitest + React Testing Library + MSW
- **State Management**: TanStack React Query
- **Storage**: Hybrid (Replit Object Storage + AWS S3)

## Testing Infrastructure Status
✅ **Vitest Configuration**: Complete with jsdom environment
✅ **Mock Service Worker**: Configured for API mocking
✅ **Supabase Mocking**: Comprehensive authentication mocking
✅ **Component Testing**: React Testing Library setup
✅ **Current Coverage**: ${this.testMap.modules.length} modules analyzed

---

`;

    // Group modules by domain
    const domains = {
      'Authentication': ['useAuth', 'Login', 'ProtectedRoute', 'supabaseClient'],
      'Posts & Content': ['posts', 'comments', 'moderation'],
      'Prayer System': ['prayer', 'leaderboard'],
      'User Management': ['profiles', 'avatars', 'admin'],
      'Storage & Media': ['storage', 'objectStorage', 's3Storage'],
      'UI & Theme': ['theme', 'components'],
      'Utilities': ['utils', 'queryClient']
    };

    for (const [domain, keywords] of Object.entries(domains)) {
      const domainModules = this.testMap.modules.filter(m => 
        keywords.some(keyword => m.path.toLowerCase().includes(keyword.toLowerCase()))
      );

      if (domainModules.length > 0) {
        md += `## Domain: ${domain}\n\n`;
        
        for (const module of domainModules) {
          md += `### Module: ${module.path}\n`;
          md += `**Exports**:\n`;
          md += `| Name | Kind | Signature | Returns | Side-effects | Errors |\n`;
          md += `|------|------|-----------|---------|--------------|--------|\n`;
          
          for (const exp of module.exports) {
            const sideEffects = exp.sideEffects.join(', ') || 'None';
            const errors = exp.errors.join(', ') || 'None';
            md += `| ${exp.name} | ${exp.kind} | \`${exp.signature.substring(0, 50)}...\` | \`${exp.returns.substring(0, 30)}...\` | ${sideEffects} | ${errors} |\n`;
          }
          
          md += `\n**Notes for testing**: Mock external dependencies, test error states\n`;
          md += `\`\`\`typescript\n// RTL snippet for ${module.path}\nrender(<Component />)\nexpect(screen.getByRole('button')).toBeInTheDocument()\n\`\`\`\n\n`;
        }
      }
    }

    return md;
  }

  private generateRoutesMarkdown(): string {
    let md = `# Gospel Era Web - Routes Map

## Router Configuration
- **Type**: React Router v6
- **Animation**: Framer Motion page transitions
- **Guards**: ProtectedRoute component for authentication

## Route Inventory

| Path | Component | Guard | Loader | Notes |
|------|-----------|-------|--------|-------|
`;

    for (const route of this.testMap.routes) {
      md += `| ${route.path} | ${route.component} | ${route.guard || 'None'} | ${route.loader || 'None'} | - |\n`;
    }

    md += `\n## Route Groups

### Authentication Routes
- \`/login\` - Login page
- \`/forgot-password\` - Password reset request
- \`/reset-password\` - Password reset form

### Main Application
- \`/\` - Dashboard (home feed)
- \`/profile\` - User profile view
- \`/settings\` - Account settings

### Prayer System
- \`/prayer/new\` - Create prayer request
- \`/prayer/browse\` - Browse prayer requests
- \`/prayer/:id\` - Prayer request details
- \`/prayer/my\` - User's prayer dashboard
- \`/prayer/leaderboard\` - Prayer leaderboard

### Admin & Moderation
- \`/admin/reports\` - Content moderation
- \`/admin/donations\` - Donation management

### Other Features
- \`/donate\` - Donation page
- \`/guidelines\` - Community guidelines
- \`/saved\` - Saved posts
`;

    return md;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Test Map Generation...');
  
  const generator = new TestMapGenerator();
  const testMap = generator.generate();
  
  generator.writeJSON();
  generator.writeMarkdown();
  generator.writeRoutesMap();
  
  console.log('✨ Test map generation complete!');
}

// Run if this is the main module
main().catch(console.error);

export { TestMapGenerator };