import crossIcon from '@assets/generated_images/Golden_spiritual_cross_icon_cd610e7e.png';
import doveIcon from '@assets/generated_images/Holy_Spirit_dove_symbol_f6fc68c8.png';
import prayingHandsIcon from '@assets/generated_images/Praying_hands_spiritual_symbol_05da059e.png';

// Main branding element with cross in navigation
export function GospelBranding() {
  return (
    <div className="flex items-center space-x-3">
      <div className="h-12 w-12 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden">
        <img 
          src={crossIcon} 
          alt="Gospel Era Cross" 
          className="w-7 h-7 opacity-90 filter brightness-200" 
        />
      </div>
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent">Gospel Era</h1>
        <p className="text-sm text-primary-600 font-medium flex items-center space-x-1">
          <img src={doveIcon} alt="Peace" className="w-3 h-3 opacity-60" />
          <span>Share your faith, grow together</span>
        </p>
      </div>
    </div>
  );
}

// Prayer section header with meaningful imagery
export function PrayerSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
      <div className="flex items-center space-x-3 mb-4">
        <img 
          src={prayingHandsIcon} 
          alt="Prayer" 
          className="w-6 h-6 opacity-70" 
        />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Prayer Requests & Testimonies</h3>
      </div>
      {children}
    </div>
  );
}

// Blessing footer with dove symbolism
export function BlessingFooter() {
  return (
    <div className="mt-8 text-center py-6 border-t border-purple-200 dark:border-purple-700">
      <div className="flex items-center justify-center space-x-2 mb-2">
        <img 
          src={doveIcon} 
          alt="Holy Spirit" 
          className="w-4 h-4 opacity-60" 
        />
        <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">
          "Where two or three gather in my name, there am I with them." - Matthew 18:20
        </span>
        <img 
          src={doveIcon} 
          alt="Holy Spirit" 
          className="w-4 h-4 opacity-60 transform scale-x-[-1]" 
        />
      </div>
    </div>
  );
}

// Post creation inspiration
export function CreationInspiration() {
  return (
    <div className="flex items-center space-x-2 text-sm text-primary-600 dark:text-primary-400 mb-4">
      <img 
        src={crossIcon} 
        alt="Faith" 
        className="w-4 h-4 opacity-60" 
      />
      <span className="italic">Share your faith journey, inspire others</span>
    </div>
  );
}