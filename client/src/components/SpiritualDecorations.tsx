import crossIcon from '@assets/generated_images/Golden_spiritual_cross_icon_cd610e7e.png';
import doveIcon from '@assets/generated_images/Holy_Spirit_dove_symbol_f6fc68c8.png';
import prayingHandsIcon from '@assets/generated_images/Praying_hands_spiritual_symbol_05da059e.png';

export function SpiritualDecorations() {
  return (
    <div className="flex items-center space-x-6 opacity-20 hover:opacity-40 transition-opacity duration-300">
      <img 
        src={crossIcon} 
        alt="Cross" 
        className="w-8 h-8 filter brightness-110" 
      />
      <img 
        src={doveIcon} 
        alt="Holy Spirit Dove" 
        className="w-8 h-8 filter brightness-110" 
      />
      <img 
        src={prayingHandsIcon} 
        alt="Praying Hands" 
        className="w-8 h-8 filter brightness-110" 
      />
    </div>
  );
}

export function FloatingSpiritual() {
  return (
    <div className="fixed top-20 right-8 z-10 pointer-events-none">
      <div className="relative">
        <img 
          src={crossIcon} 
          alt="" 
          className="w-12 h-12 opacity-10 animate-pulse filter brightness-125" 
        />
      </div>
    </div>
  );
}

export function SidebarSpiritual() {
  return (
    <div className="hidden lg:block fixed left-8 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
      <div className="flex flex-col space-y-8">
        <img 
          src={doveIcon} 
          alt="" 
          className="w-10 h-10 opacity-15 animate-pulse filter brightness-125" 
          style={{ animationDelay: '1s' }}
        />
        <img 
          src={prayingHandsIcon} 
          alt="" 
          className="w-10 h-10 opacity-15 animate-pulse filter brightness-125" 
          style={{ animationDelay: '2s' }}
        />
      </div>
    </div>
  );
}