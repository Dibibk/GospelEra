/**
 * Scripture utilities for daily verses and biblical content
 */

/**
 * Gets a daily Bible verse that rotates based on the current date
 * Uses a local collection of inspiring verses to ensure reliability
 * @returns {Promise<{reference: string, text: string}>}
 */
// Collection of inspiring Bible verses for daily rotation
const dailyVerses = [
  {
    reference: "Psalm 119:105",
    text: "Your word is a lamp for my feet, a light on my path."
  },
  {
    reference: "Jeremiah 29:11",
    text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future."
  },
  {
    reference: "Philippians 4:13",
    text: "I can do all this through him who gives me strength."
  },
  {
    reference: "Romans 8:28",
    text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose."
  },
  {
    reference: "Proverbs 3:5-6",
    text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."
  },
  {
    reference: "Isaiah 40:31",
    text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint."
  },
  {
    reference: "Matthew 6:26",
    text: "Look at the birds of the air; they do not sow or reap or store away in barns, and yet your heavenly Father feeds them. Are you not much more valuable than they?"
  },
  {
    reference: "2 Corinthians 5:17",
    text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!"
  },
  {
    reference: "Psalm 23:1",
    text: "The Lord is my shepherd, I lack nothing."
  },
  {
    reference: "John 3:16",
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."
  },
  {
    reference: "Psalm 46:10",
    text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth."
  },
  {
    reference: "Matthew 11:28",
    text: "Come to me, all you who are weary and burdened, and I will give you rest."
  },
  {
    reference: "1 Corinthians 10:13",
    text: "No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear."
  },
  {
    reference: "Ephesians 2:8-9",
    text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast."
  },
  {
    reference: "Psalm 37:4",
    text: "Take delight in the Lord, and he will give you the desires of your heart."
  },
  {
    reference: "Romans 12:2",
    text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind."
  },
  {
    reference: "Galatians 5:22-23",
    text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control."
  },
  {
    reference: "Psalm 139:14",
    text: "I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well."
  },
  {
    reference: "Joshua 1:9",
    text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."
  },
  {
    reference: "1 Peter 5:7",
    text: "Cast all your anxiety on him because he cares for you."
  },
  {
    reference: "Psalm 121:1-2",
    text: "I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord, the Maker of heaven and earth."
  },
  {
    reference: "Colossians 3:23",
    text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters."
  },
  {
    reference: "Hebrews 11:1",
    text: "Now faith is confidence in what we hope for and assurance about what we do not see."
  },
  {
    reference: "1 John 4:19",
    text: "We love because he first loved us."
  },
  {
    reference: "Psalm 27:1",
    text: "The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?"
  },
  {
    reference: "Proverbs 16:3",
    text: "Commit to the Lord whatever you do, and he will establish your plans."
  },
  {
    reference: "Isaiah 26:3",
    text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you."
  },
  {
    reference: "Matthew 5:16",
    text: "In the same way, let your light shine before others, that they may see your good deeds and glorify your Father in heaven."
  },
  {
    reference: "Revelation 21:4",
    text: "He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain, for the old order of things has passed away."
  },
  {
    reference: "Psalm 90:12",
    text: "Teach us to number our days, that we may gain a heart of wisdom."
  }
]

export async function getDailyVerse(): Promise<{reference: string, text: string}> {
  try {
    // Calculate which verse to show based on current date
    const today = new Date()
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    const verseIndex = dayOfYear % dailyVerses.length
    
    return dailyVerses[verseIndex]
  } catch (error) {
    console.error('Failed to get daily verse:', error)
    
    // Fallback to first verse if calculation fails
    return dailyVerses[0]
  }
}