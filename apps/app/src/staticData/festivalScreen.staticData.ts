export const festivalScreenData = {
  colors: ["#1f4a6b", "#4f3d2b", "#3a5d3f", "#5a3f46", "#2f425d", "#5b4a2f"],
  hero: {
    kicker: "EXPLOREVALLEY FEST",
    title: "ExploreValley Highlights",
    subtitle: "Browse upcoming events, compare vibes, and book your next trip around live experiences.",
  },
  pills: ["Live Music", "Food Trails", "Cultural Nights", "Family Friendly"],
  loading: "Loading ExploreValley highlights...",
  empty: "No ExploreValley data in JSON.",
  defaults: {
    season: "All Season",
    title: "Festival",
    vibe: "Live events and cultural experiences",
    ticket: "On request",
    location: "Explore Valley",
  },
  pricing: {
    from: (value: number | string) => `From INR ${value}`,
  },
  actions: {
    viewLineup: "View Lineup",
    bookPass: "Book Pass",
  },
  api: {
    festivals: "/api/festivals",
    tours: "/api/tours",
  },
};
