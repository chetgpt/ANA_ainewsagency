
// Keywords for each category
const categoryKeywords = {
  world: [
    'world', 'global', 'international', 'country', 'nation', 'foreign', 'diplomatic', 
    'election', 'politics', 'president', 'minister', 'government', 'war', 'climate',
    'summit', 'treaty', 'united nations', 'eu', 'european union'
  ],
  business: [
    'business', 'economy', 'economic', 'market', 'stock', 'finance', 'investment',
    'trade', 'company', 'corporate', 'industry', 'profit', 'revenue', 'startup',
    'entrepreneur', 'inflation', 'recession', 'dollar', 'euro', 'bank', 'tech'
  ],
  sports: [
    'sports', 'sport', 'game', 'match', 'tournament', 'championship', 'league',
    'team', 'player', 'coach', 'football', 'soccer', 'basketball', 'baseball',
    'tennis', 'golf', 'olympic', 'nba', 'nfl', 'nhl', 'mlb', 'fifa', 'score'
  ],
  entertainment: [
    'entertainment', 'celebrity', 'actor', 'actress', 'star', 'hollywood', 'tv',
    'television', 'show', 'series', 'reality', 'drama', 'comedy', 'gossip', 'award'
  ],
  music: [
    'music', 'song', 'album', 'artist', 'band', 'concert', 'festival', 'tour',
    'singer', 'musician', 'pop', 'rock', 'rap', 'hip hop', 'jazz', 'grammy'
  ],
  movies: [
    'movie', 'film', 'cinema', 'director', 'box office', 'trailer', 'premiere',
    'hollywood', 'actor', 'actress', 'oscar', 'blockbuster', 'review', 'rating'
  ]
};

export function categorizeNewsItem(title: string, description: string): string {
  // Combine title and description for analysis, convert to lowercase
  const content = (title + ' ' + description).toLowerCase();
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  // Default category if no match is found
  return "world"; // Default to world news
}
