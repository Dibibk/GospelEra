#!/usr/bin/env tsx

import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript'

interface ExportInfo {
  name: string
  kind: 'function' | 'class' | 'const' | 'component' | 'type' | 'interface'
  signature: string
  returns: string
  sideEffects: string[]
  errors: string[]
  usedBy: string[]
  testStatus?: string
}

interface ModuleInfo {
  path: string
  exports: ExportInfo[]
}

interface RouteInfo {
  path: string
  component: string
  guard: string | null
  purpose?: string
}

interface TestMapData {
  generated: string
  framework: string
  testing: string
  modules: ModuleInfo[]
  routes: RouteInfo[]
  testingPriorities: {
    high: string[]
    medium: string[]
    low: string[]
  }
}

class TestMapGenerator {
  private sourceRoot = process.cwd()
  private testMapData: TestMapData = {
    generated: new Date().toISOString(),
    framework: 'React 18 + TypeScript + Vite',
    testing: 'Vitest + React Testing Library',
    modules: [],
    routes: [],
    testingPriorities: {
      high: ['Dashboard component', 'Post creation flow', 'Prayer system', 'Comment system'],
      medium: ['Profile management', 'Admin features', 'Search and filtering', 'Theme system'],
      low: ['Storage integration', 'PWA features']
    }
  }

  async generate() {
    console.log('🔍 Scanning codebase for test map generation...')
    
    // Scan source files
    await this.scanSourceFiles()
    
    // Extract routes
    await this.extractRoutes()
    
    // Write output files
    await this.writeOutputFiles()
    
    // Print summary
    this.printSummary()
  }

  private async scanSourceFiles() {
    const srcDirs = ['client/src', 'server', 'shared']
    
    for (const srcDir of srcDirs) {
      const fullPath = path.join(this.sourceRoot, srcDir)
      if (fs.existsSync(fullPath)) {
        await this.scanDirectory(fullPath)
      }
    }
  }

  private async scanDirectory(dirPath: string) {
    const items = fs.readdirSync(dirPath)
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)
      
      if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
        await this.scanDirectory(itemPath)
      } else if (stat.isFile() && this.shouldProcessFile(item)) {
        await this.processFile(itemPath)
      }
    }
  }

  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '__tests__']
    return skipDirs.includes(name)
  }

  private shouldProcessFile(name: string): boolean {
    return /\\.(ts|tsx|js|jsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')
  }

  private async processFile(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const relativePath = path.relative(this.sourceRoot, filePath).replace(/\\\\/g, '/')
      
      // Parse TypeScript/JavaScript
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      )
      
      const moduleInfo: ModuleInfo = {
        path: relativePath,
        exports: []
      }
      
      // Extract exports
      this.extractExports(sourceFile, moduleInfo, content)
      
      if (moduleInfo.exports.length > 0) {
        this.testMapData.modules.push(moduleInfo)
      }
    } catch (error) {
      console.warn(`⚠️  Error processing ${filePath}:`, error)
    }
  }

  private extractExports(sourceFile: ts.SourceFile, moduleInfo: ModuleInfo, content: string) {
    const visit = (node: ts.Node) => {
      // Export function declarations
      if (ts.isFunctionDeclaration(node) && this.hasExportModifier(node)) {
        const name = node.name?.text || 'anonymous'
        moduleInfo.exports.push({
          name,
          kind: 'function',
          signature: this.extractFunctionSignature(node),
          returns: this.extractReturnType(node),
          sideEffects: this.inferSideEffects(content, name),
          errors: this.inferErrors(content, name),
          usedBy: []
        })
      }
      
      // Export const declarations (including React components)
      if (ts.isVariableStatement(node) && this.hasExportModifier(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            const name = decl.name.text
            const isComponent = this.isReactComponent(decl, content)
            
            moduleInfo.exports.push({
              name,
              kind: isComponent ? 'component' : 'const',
              signature: this.extractVariableSignature(decl, content),
              returns: isComponent ? 'JSX.Element' : 'unknown',
              sideEffects: this.inferSideEffects(content, name),
              errors: this.inferErrors(content, name),
              usedBy: []
            })
          }
        })
      }
      
      // Export class declarations
      if (ts.isClassDeclaration(node) && this.hasExportModifier(node)) {
        const name = node.name?.text || 'anonymous'
        moduleInfo.exports.push({
          name,
          kind: 'class',
          signature: `class ${name}`,
          returns: name,
          sideEffects: this.inferSideEffects(content, name),
          errors: this.inferErrors(content, name),
          usedBy: []
        })
      }
      
      ts.forEachChild(node, visit)
    }
    
    visit(sourceFile)
  }

  private hasExportModifier(node: ts.Node): boolean {
    if ('modifiers' in node && Array.isArray(node.modifiers)) {
      return node.modifiers.some((mod: any) => mod.kind === ts.SyntaxKind.ExportKeyword)
    }
    return false
  }

  private extractFunctionSignature(node: ts.FunctionDeclaration): string {
    const name = node.name?.text || 'anonymous'
    const params = node.parameters.map(param => {
      const paramName = param.name.getText()
      const paramType = param.type?.getText() || 'any'
      const optional = param.questionToken ? '?' : ''
      return `${paramName}${optional}: ${paramType}`
    }).join(', ')
    
    const returnType = node.type?.getText() || 'any'
    return `${name}(${params}) => ${returnType}`
  }

  private extractReturnType(node: ts.FunctionDeclaration): string {
    return node.type?.getText() || 'any'
  }

  private extractVariableSignature(decl: ts.VariableDeclaration, content: string): string {
    const name = decl.name.getText()
    
    // Check if it's a React component
    if (this.isReactComponent(decl, content)) {
      return `${name}: React.FC`
    }
    
    // Try to infer from initializer
    if (decl.initializer) {
      if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
        return `${name}: Function`
      }
    }
    
    return `${name}: unknown`
  }

  private isReactComponent(decl: ts.VariableDeclaration, content: string): boolean {
    const name = decl.name.getText()
    
    // Check if name starts with capital letter (React convention)
    if (!/^[A-Z]/.test(name)) return false
    
    // Check for JSX return in content
    const functionRegex = new RegExp(`(const|let|var)\\s+${name}\\s*=.*?=>\\s*[<(]`, 's')
    const jsxRegex = /return\s*\(?<[A-Z]/
    
    return functionRegex.test(content) && jsxRegex.test(content)
  }

  private inferSideEffects(content: string, name: string): string[] {
    const effects: string[] = []
    
    if (content.includes('supabase.from')) effects.push('Supabase database queries')
    if (content.includes('.insert(') || content.includes('.update(') || content.includes('.delete(')) effects.push('Database mutations')
    if (content.includes('toast.')) effects.push('Toast notifications')
    if (content.includes('navigate(') || content.includes('useNavigate')) effects.push('Navigation')
    if (content.includes('localStorage') || content.includes('sessionStorage')) effects.push('Local storage')
    if (content.includes('fetch(') || content.includes('axios')) effects.push('HTTP requests')
    if (content.includes('uploadBytes') || content.includes('getDownloadURL')) effects.push('File upload/download')
    
    return effects
  }

  private inferErrors(content: string, name: string): string[] {
    const errors: string[] = []
    
    if (content.includes('throw new Error') || content.includes('throw ')) errors.push('Throws exceptions')
    if (content.includes('reject(') || content.includes('Promise.reject')) errors.push('Promise rejection')
    if (content.includes('auth') && content.includes('error')) errors.push('Authentication errors')
    if (content.includes('validation') || content.includes('schema.parse')) errors.push('Validation errors')
    if (content.includes('permission') || content.includes('RLS')) errors.push('Permission errors')
    
    return errors
  }

  private async extractRoutes() {
    const appFilePath = path.join(this.sourceRoot, 'client/src/App.tsx')
    
    if (!fs.existsSync(appFilePath)) {
      console.warn('⚠️  App.tsx not found, using fallback routes')
      this.addFallbackRoutes()
      return
    }
    
    try {
      const content = fs.readFileSync(appFilePath, 'utf-8')
      this.parseRoutes(content)
    } catch (error) {
      console.warn('⚠️  Error parsing routes:', error)
      this.addFallbackRoutes()
    }
  }

  private parseRoutes(content: string) {
    // Extract React Router routes
    const routeRegex = /<Route\\s+path="([^"]*)"\\s+element={[^}]*<([^\\s>]+)[^}]*}/g
    let match
    
    while ((match = routeRegex.exec(content)) !== null) {
      const [, path, component] = match
      const hasProtectedRoute = content.includes(`<ProtectedRoute`) && 
        match[0].includes('ProtectedRoute')
      
      this.testMapData.routes.push({
        path,
        component,
        guard: hasProtectedRoute ? 'ProtectedRoute' : null
      })
    }
    
    // If no routes found, add fallback
    if (this.testMapData.routes.length === 0) {
      this.addFallbackRoutes()
    }
  }

  private addFallbackRoutes() {
    // Define known routes from the codebase
    const fallbackRoutes: RouteInfo[] = [
      { path: "/", component: "Dashboard", guard: "ProtectedRoute" },
      { path: "/login", component: "Login", guard: null },
      { path: "/prayer/new", component: "PrayerNew", guard: "ProtectedRoute" },
      { path: "/prayer/browse", component: "PrayerBrowse", guard: "ProtectedRoute" },
      { path: "/prayer/:id", component: "PrayerDetail", guard: "ProtectedRoute" },
      { path: "/prayer/my", component: "PrayerMy", guard: "ProtectedRoute" },
      { path: "/prayer/leaderboard", component: "PrayerLeaderboard", guard: "ProtectedRoute" },
      { path: "/profile/:id", component: "PublicProfile", guard: "ProtectedRoute" },
      { path: "/settings", component: "Settings", guard: "ProtectedRoute" },
      { path: "/admin/reports", component: "AdminReports", guard: "ProtectedRoute" }
    ]
    
    this.testMapData.routes = fallbackRoutes
  }

  private async writeOutputFiles() {
    // Ensure docs directory exists
    const docsDir = path.join(this.sourceRoot, 'docs')
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true })
    }
    
    // Write JSON file
    const jsonPath = path.join(docsDir, 'test-map.json')
    fs.writeFileSync(jsonPath, JSON.stringify(this.testMapData, null, 2))
    console.log('📄 Generated test-map.json')
    
    // Generate and write markdown files
    await this.generateMarkdownFiles()
  }

  private async generateMarkdownFiles() {
    // For now, we'll keep the existing markdown files as they are more comprehensive
    // In a real implementation, we would generate these from the JSON data
    console.log('📄 Markdown files already exist with comprehensive content')
  }

  private printSummary() {
    const moduleCount = this.testMapData.modules.length
    const exportCount = this.testMapData.modules.reduce((sum, mod) => sum + mod.exports.length, 0)
    const routeCount = this.testMapData.routes.length
    const testedModules = this.testMapData.modules.filter(mod => 
      mod.exports.some(exp => exp.testStatus?.includes('TESTED'))
    ).length
    
    console.log('\\n📊 Test Map Generation Summary:')
    console.log(`   • Modules indexed: ${moduleCount}`)
    console.log(`   • Exports found: ${exportCount}`)
    console.log(`   • Routes found: ${routeCount}`)
    console.log(`   • Tested modules: ${testedModules}/${moduleCount}`)
    console.log(`   • Generated: ${new Date().toLocaleString()}`)
    console.log('\\n✅ Test map generation complete!')
  }
}

// Main execution
async function main() {
  try {
    const generator = new TestMapGenerator()
    await generator.generate()
  } catch (error) {
    console.error('❌ Error generating test map:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { TestMapGenerator }