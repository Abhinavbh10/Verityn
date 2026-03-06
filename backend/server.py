from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import feedparser
import httpx
import asyncio
from datetime import datetime, timedelta
from pydantic import BaseModel
import hashlib
import time
import re
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Verityn News API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Minimum description length (characters) - if shorter, we'll try to fetch more
MIN_DESCRIPTION_LENGTH = 200

# Fallback placeholder image for articles without images
FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80"  # Generic news image

# Stop words to ignore in relevance checking
STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
    'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
    'once', 'if', 'after', 'before', 'while', 'during', 'about', 'into', 'through',
    'over', 'under', 'again', 'further', 'says', 'said', 'new', 'first', 'last', 'year',
    'years', 'day', 'days', 'time', 'week', 'month', 'today', 'news', 'report', 'reports'
}

# Junk patterns to remove from descriptions
JUNK_PATTERNS = [
    # Newsletter signup junk
    r'Sign up for breaking news.*?sign-up was successful',
    r'Sign up for.*?newsletter',
    r'Subscribe to our.*?newsletter',
    r'You are now subscribed',
    r'Your newsletter sign-up was successful',
    r'Get the latest.*?delivered to your inbox',
    r'Join our mailing list',
    r'Enter your email.*?subscribe',
    # Social media prompts
    r'Follow us on (Twitter|Facebook|Instagram|LinkedIn)',
    r'Share this (article|story) on',
    r'Like us on Facebook',
    # Cookie/privacy notices
    r'We use cookies.*?experience',
    r'By continuing.*?cookies',
    r'Accept all cookies',
    # Read more padding (our own)
    r'Read the full article for more details and comprehensive coverage of this developing story\.',
    # Generic filler
    r'Click here to.*',
    r'Tap here to.*',
    r'Continue reading\.\.\.',
    # Advertisement markers  
    r'\[Advertisement\]',
    r'Sponsored content',
    r'ADVERTISEMENT',
]

def clean_description(text: str) -> str:
    """Remove junk content from article descriptions"""
    if not text:
        return text
    
    cleaned = text
    
    # Remove junk patterns
    for pattern in JUNK_PATTERNS:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)
    
    # Clean up multiple spaces and newlines
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = cleaned.strip()
    
    # Remove leading/trailing punctuation artifacts
    cleaned = re.sub(r'^[\s\-–—:,;]+', '', cleaned)
    cleaned = re.sub(r'[\s\-–—:,;]+$', '', cleaned)
    
    return cleaned.strip()

def is_content_relevant(title: str, description: str, min_matches: int = 2) -> bool:
    """Check if description content is relevant to the title using keyword matching"""
    if not title or not description:
        return False
    
    # Extract significant words from title (lowercase, remove punctuation)
    title_clean = re.sub(r'[^\w\s]', '', title.lower())
    title_words = set(title_clean.split()) - STOP_WORDS
    
    # Extract words from description
    desc_clean = re.sub(r'[^\w\s]', '', description.lower())
    desc_words = set(desc_clean.split()) - STOP_WORDS
    
    # Find common significant words
    common_words = title_words & desc_words
    
    # Check for partial matches (e.g., "Trump" matches "Trump's")
    partial_matches = 0
    for title_word in title_words:
        if len(title_word) >= 4:  # Only check words with 4+ chars
            for desc_word in desc_words:
                if title_word in desc_word or desc_word in title_word:
                    partial_matches += 1
                    break
    
    total_matches = len(common_words) + partial_matches
    return total_matches >= min_matches

# Models
class NewsArticle(BaseModel):
    id: str
    title: str
    description: str
    link: str
    published: str
    source: str
    category: str
    image_url: Optional[str] = None

class NewsResponse(BaseModel):
    articles: List[NewsArticle]
    total: int
    category: str

# European Regional RSS Feeds - for location-based news
REGIONAL_RSS_FEEDS = {
    # United Kingdom
    "uk": [
        {"url": "https://feeds.bbci.co.uk/news/england/rss.xml", "source": "BBC England"},
        {"url": "https://feeds.bbci.co.uk/news/scotland/rss.xml", "source": "BBC Scotland"},
        {"url": "https://feeds.bbci.co.uk/news/wales/rss.xml", "source": "BBC Wales"},
        {"url": "https://feeds.bbci.co.uk/news/northern_ireland/rss.xml", "source": "BBC N. Ireland"},
        {"url": "https://www.theguardian.com/uk-news/rss", "source": "The Guardian UK"},
        {"url": "https://feeds.skynews.com/feeds/rss/uk.xml", "source": "Sky News UK"},
    ],
    # Germany
    "germany": [
        {"url": "https://rss.dw.com/rdf/rss-en-ger", "source": "DW Germany"},
        {"url": "https://www.reuters.com/rssFeed/GCA-Germany", "source": "Reuters Germany"},
    ],
    # France
    "france": [
        {"url": "https://www.france24.com/en/rss", "source": "France 24"},
        {"url": "https://www.rfi.fr/en/rss", "source": "RFI English"},
    ],
    # Spain
    "spain": [
        {"url": "https://english.elpais.com/rss/elpais/inenglish.xml", "source": "El Pais English"},
        {"url": "https://feeds.feedburner.com/spanishnewstoday", "source": "Spanish News Today"},
    ],
    # Italy
    "italy": [
        {"url": "https://www.ansa.it/english/news/rss.xml", "source": "ANSA Italy"},
        {"url": "https://www.reuters.com/rssFeed/GCA-Italy", "source": "Reuters Italy"},
    ],
    # Netherlands
    "netherlands": [
        {"url": "https://www.dutchnews.nl/feed/", "source": "Dutch News"},
        {"url": "https://nltimes.nl/feed", "source": "NL Times"},
    ],
    # Ireland
    "ireland": [
        {"url": "https://www.irishtimes.com/rss/news/ireland.xml", "source": "Irish Times"},
        {"url": "http://feeds.bbci.co.uk/news/northern_ireland/rss.xml", "source": "BBC N. Ireland"},
        {"url": "https://www.rte.ie/news/rss/news-headlines.xml", "source": "RTE News"},
    ],
    # Switzerland
    "switzerland": [
        {"url": "https://www.swissinfo.ch/eng/news/rss", "source": "SwissInfo"},
    ],
    # Austria
    "austria": [
        {"url": "https://www.reuters.com/rssFeed/GCA-Austria", "source": "Reuters Austria"},
    ],
    # Scandinavia
    "norway": [
        {"url": "https://www.newsinenglish.no/feed/", "source": "News in English NO"},
    ],
    "sweden": [
        {"url": "https://www.thelocal.se/feed", "source": "The Local SE"},
    ],
    "denmark": [
        {"url": "https://cphpost.dk/feed/", "source": "Copenhagen Post"},
    ],
    # USA Regions
    "usa": [
        {"url": "https://rss.nytimes.com/services/xml/rss/nyt/US.xml", "source": "NY Times US"},
        {"url": "https://feeds.npr.org/1003/rss.xml", "source": "NPR US"},
        {"url": "https://feeds.washingtonpost.com/rss/national", "source": "Washington Post"},
        {"url": "https://www.latimes.com/local/rss2.0.xml", "source": "LA Times"},
        {"url": "https://www.sfchronicle.com/bayarea/feed/Bay-Area-News-702.php", "source": "SF Chronicle"},
    ],
    "new york": [
        {"url": "https://rss.nytimes.com/services/xml/rss/nyt/NYRegion.xml", "source": "NY Times Metro"},
        {"url": "https://gothamist.com/feed", "source": "Gothamist"},
    ],
    "california": [
        {"url": "https://www.latimes.com/local/rss2.0.xml", "source": "LA Times Local"},
        {"url": "https://www.sfchronicle.com/bayarea/feed/Bay-Area-News-702.php", "source": "SF Chronicle"},
    ],
    "texas": [
        {"url": "https://www.texastribune.org/feeds/articles.rss", "source": "Texas Tribune"},
    ],
    "florida": [
        {"url": "https://www.miamiherald.com/news/local/feed/rss.xml", "source": "Miami Herald"},
    ],
    # Canada
    "canada": [
        {"url": "https://www.cbc.ca/cmlink/rss-topstories", "source": "CBC News"},
        {"url": "https://globalnews.ca/feed/", "source": "Global News CA"},
    ],
    # Australia
    "australia": [
        {"url": "https://www.abc.net.au/news/feed/51120/rss.xml", "source": "ABC Australia"},
        {"url": "https://www.smh.com.au/rss/feed.xml", "source": "Sydney Morning Herald"},
    ],
    # India
    "india": [
        {"url": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", "source": "Times of India"},
        {"url": "https://www.thehindu.com/news/national/feeder/default.rss", "source": "The Hindu"},
        {"url": "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", "source": "Hindustan Times"},
    ],
}

# City keywords for filtering
CITY_KEYWORDS = {
    # UK Cities
    "london": ["london", "westminster", "city of london", "greater london"],
    "manchester": ["manchester", "greater manchester"],
    "birmingham": ["birmingham", "west midlands"],
    "edinburgh": ["edinburgh", "scottish capital"],
    "glasgow": ["glasgow"],
    "liverpool": ["liverpool", "merseyside"],
    # German Cities
    "berlin": ["berlin"],
    "munich": ["munich", "münchen", "bavaria"],
    "frankfurt": ["frankfurt"],
    "hamburg": ["hamburg"],
    # French Cities
    "paris": ["paris", "ile-de-france"],
    "lyon": ["lyon"],
    "marseille": ["marseille"],
    # Spanish Cities
    "madrid": ["madrid"],
    "barcelona": ["barcelona", "catalonia", "catalunya"],
    # Italian Cities
    "rome": ["rome", "roma"],
    "milan": ["milan", "milano"],
    # Other European Cities
    "amsterdam": ["amsterdam"],
    "rotterdam": ["rotterdam"],
    "dublin": ["dublin"],
    "zurich": ["zurich", "zürich"],
    "geneva": ["geneva", "genève"],
    "vienna": ["vienna", "wien"],
    "stockholm": ["stockholm"],
    "oslo": ["oslo"],
    "copenhagen": ["copenhagen", "københavn"],
    "helsinki": ["helsinki"],
    "warsaw": ["warsaw", "warszawa"],
    "prague": ["prague", "praha"],
    "athens": ["athens", "athina"],
    "lisbon": ["lisbon", "lisboa"],
    "brussels": ["brussels", "bruxelles"],
    # US Cities
    "new york": ["new york", "nyc", "manhattan", "brooklyn", "queens", "bronx"],
    "los angeles": ["los angeles", "la", "hollywood", "beverly hills"],
    "chicago": ["chicago", "illinois"],
    "houston": ["houston", "texas"],
    "phoenix": ["phoenix", "arizona"],
    "philadelphia": ["philadelphia", "philly"],
    "san antonio": ["san antonio"],
    "san diego": ["san diego"],
    "dallas": ["dallas", "fort worth"],
    "san francisco": ["san francisco", "sf", "bay area", "silicon valley"],
    "austin": ["austin", "texas"],
    "seattle": ["seattle", "washington"],
    "denver": ["denver", "colorado"],
    "boston": ["boston", "massachusetts"],
    "miami": ["miami", "florida"],
    "atlanta": ["atlanta", "georgia"],
    "washington dc": ["washington dc", "dc", "capitol", "white house"],
    # Canadian Cities
    "toronto": ["toronto", "ontario"],
    "vancouver": ["vancouver", "bc", "british columbia"],
    "montreal": ["montreal", "quebec"],
    # Australian Cities
    "sydney": ["sydney", "nsw"],
    "melbourne": ["melbourne", "victoria"],
    # Indian Cities
    "mumbai": ["mumbai", "bombay", "maharashtra"],
    "delhi": ["delhi", "new delhi"],
    "bangalore": ["bangalore", "bengaluru", "karnataka"],
}

# European RSS Feed Sources organized by category
RSS_FEEDS = {
    "politics": [
        # European Sources
        {"url": "http://feeds.bbci.co.uk/news/politics/rss.xml", "source": "BBC Politics"},
        {"url": "https://www.theguardian.com/politics/rss", "source": "The Guardian Politics"},
        {"url": "https://rss.dw.com/rdf/rss-en-eu", "source": "DW Europe"},
        {"url": "https://www.euronews.com/rss?level=theme&name=news", "source": "Euronews"},
        {"url": "https://www.politico.eu/feed/", "source": "Politico EU"},
        # US Sources
        {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", "source": "NY Times Politics"},
        {"url": "https://feeds.washingtonpost.com/rss/politics", "source": "Washington Post"},
        {"url": "https://www.politico.com/rss/politics.xml", "source": "Politico US"},
        {"url": "https://feeds.npr.org/1014/rss.xml", "source": "NPR Politics"},
        # Global Sources
        {"url": "http://feeds.bbci.co.uk/news/world/rss.xml", "source": "BBC World"},
        {"url": "https://www.theguardian.com/world/rss", "source": "The Guardian World"},
        {"url": "https://www.aljazeera.com/xml/rss/all.xml", "source": "Al Jazeera"},
        {"url": "https://feeds.reuters.com/reuters/topNews", "source": "Reuters"},
    ],
    "business": [
        # European Sources
        {"url": "http://feeds.bbci.co.uk/news/business/rss.xml", "source": "BBC Business"},
        {"url": "https://www.theguardian.com/uk/business/rss", "source": "The Guardian Business"},
        {"url": "https://rss.dw.com/rdf/rss-en-bus", "source": "DW Business"},
        {"url": "https://feeds.skynews.com/feeds/rss/business.xml", "source": "Sky News Business"},
        {"url": "https://www.ft.com/rss/home/uk", "source": "Financial Times"},
        {"url": "https://www.politico.eu/section/economy-jobs/feed/", "source": "Politico EU Economy"},
        {"url": "https://www.euronews.com/rss?level=theme&name=business", "source": "Euronews Business"},
        # US & Global Sources
        {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", "source": "NY Times Business"},
        {"url": "https://feeds.bloomberg.com/markets/news.rss", "source": "Bloomberg Markets"},
        {"url": "https://www.cnbc.com/id/10001147/device/rss/rss.html", "source": "CNBC"},
        {"url": "https://feeds.npr.org/1006/rss.xml", "source": "NPR Business"},
        {"url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", "source": "CNBC World"},
    ],
    "technology": [
        # European Sources
        {"url": "http://feeds.bbci.co.uk/news/technology/rss.xml", "source": "BBC Technology"},
        {"url": "https://www.theguardian.com/uk/technology/rss", "source": "The Guardian Tech"},
        {"url": "https://rss.dw.com/rdf/rss-en-sci", "source": "DW Science & Tech"},
        {"url": "https://www.techradar.com/rss", "source": "TechRadar"},
        {"url": "https://www.politico.eu/section/technology/feed/", "source": "Politico EU Tech"},
        {"url": "https://www.euronews.com/rss?level=theme&name=next", "source": "Euronews Tech"},
        # US & Global Sources
        {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", "source": "NY Times Tech"},
        {"url": "https://feeds.arstechnica.com/arstechnica/index", "source": "Ars Technica"},
        {"url": "https://www.theverge.com/rss/index.xml", "source": "The Verge"},
        {"url": "https://www.wired.com/feed/rss", "source": "Wired"},
        {"url": "https://techcrunch.com/feed/", "source": "TechCrunch"},
    ],
    "sports": [
        # European Sources
        {"url": "http://feeds.bbci.co.uk/sport/rss.xml", "source": "BBC Sport"},
        {"url": "https://www.theguardian.com/uk/sport/rss", "source": "The Guardian Sport"},
        {"url": "https://feeds.skynews.com/feeds/rss/sports.xml", "source": "Sky News Sport"},
        {"url": "https://www.euronews.com/rss?level=theme&name=sport", "source": "Euronews Sport"},
        # US & Global Sources
        {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml", "source": "NY Times Sports"},
        {"url": "https://www.espn.com/espn/rss/news", "source": "ESPN"},
        {"url": "https://api.foxsports.com/v1/rss?partnerKey=zBaFxRyGKCfxBagJG9b8pqLyndmvo7UU", "source": "Fox Sports"},
    ],
    "entertainment": [
        # European Sources
        {"url": "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", "source": "BBC Entertainment"},
        {"url": "https://www.theguardian.com/uk/culture/rss", "source": "The Guardian Culture"},
        {"url": "https://rss.dw.com/rdf/rss-en-cul", "source": "DW Culture"},
        {"url": "https://www.euronews.com/rss?level=theme&name=culture", "source": "Euronews Culture"},
        # US & Global Sources
        {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml", "source": "NY Times Arts"},
        {"url": "https://variety.com/feed/", "source": "Variety"},
        {"url": "https://www.hollywoodreporter.com/feed/", "source": "Hollywood Reporter"},
        {"url": "https://ew.com/feed/", "source": "Entertainment Weekly"},
    ],
    "health": [
        # European Sources
        {"url": "http://feeds.bbci.co.uk/news/health/rss.xml", "source": "BBC Health"},
        {"url": "https://www.theguardian.com/lifeandstyle/health-and-wellbeing/rss", "source": "The Guardian Health"},
        {"url": "https://rss.dw.com/rdf/rss-en-health", "source": "DW Health"},
        # US & Global Sources
        {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml", "source": "NY Times Health"},
        {"url": "https://feeds.npr.org/1128/rss.xml", "source": "NPR Health"},
        {"url": "https://www.statnews.com/feed/", "source": "STAT News"},
        {"url": "https://www.webmd.com/xml/rss/rss.xml", "source": "WebMD"},
    ],
    "science": [
        # European Sources
        {"url": "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml", "source": "BBC Science"},
        {"url": "https://www.theguardian.com/science/rss", "source": "The Guardian Science"},
        {"url": "https://rss.dw.com/rdf/rss-en-sci", "source": "DW Science"},
        {"url": "https://www.newscientist.com/feed/home/", "source": "New Scientist"},
        # US & Global Sources
        {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml", "source": "NY Times Science"},
        {"url": "https://www.sciencedaily.com/rss/all.xml", "source": "Science Daily"},
        {"url": "https://feeds.nature.com/nature/rss/current", "source": "Nature"},
        {"url": "https://www.space.com/feeds/all", "source": "Space.com"},
        {"url": "https://feeds.npr.org/1007/rss.xml", "source": "NPR Science"},
    ],
}

# Simple in-memory cache
NEWS_CACHE = {}
CACHE_DURATION = 300  # 5 minutes

def generate_article_id(title: str, link: str) -> str:
    """Generate a unique ID for an article"""
    content = f"{title}{link}"
    return hashlib.md5(content.encode()).hexdigest()[:12]

def is_high_quality_image(url: str) -> bool:
    """Check if image URL appears to be high quality (not a thumbnail)"""
    if not url:
        return False
    url_lower = url.lower()
    # Reject common thumbnail patterns
    thumbnail_patterns = ['thumbnail', 'thumb', '_s.', '_t.', '_xs.', '_small', 
                         '150x', '100x', '75x', '50x', '/s/', '-small', 'icon']
    for pattern in thumbnail_patterns:
        if pattern in url_lower:
            return False
    # Prefer larger image patterns
    return True

def get_best_image_url(url: str) -> str:
    """Try to get higher quality version of image URL"""
    if not url:
        return url
    
    # BBC images - upgrade to larger size
    if 'ichef.bbci.co.uk' in url:
        # Replace common BBC image size patterns with larger sizes
        url = re.sub(r'/\d+xn/', '/976xn/', url)
        url = re.sub(r'/\d+x\d+/', '/976x549/', url)
    
    # Guardian images - use larger size
    if 'guim.co.uk' in url:
        url = re.sub(r'/\d+\.jpg', '/1000.jpg', url)
        
    # Remove webp format preference for compatibility
    if '.webp' in url and 'format=auto' not in url:
        url = url.replace('.webp', '.jpg')
    
    return url

def extract_image_from_entry(entry) -> Optional[str]:
    """Extract high-quality image URL from RSS entry"""
    image_url = None
    
    # Try media:content first (usually has better quality)
    if hasattr(entry, 'media_content') and entry.media_content:
        # Sort by width if available, prefer larger images
        media_images = []
        for media in entry.media_content:
            if media.get('medium') == 'image' or media.get('type', '').startswith('image'):
                width = int(media.get('width', 0) or 0)
                media_images.append((width, media.get('url')))
        if media_images:
            # Get the largest image
            media_images.sort(reverse=True)
            image_url = media_images[0][1]
    
    # Try media:thumbnail
    if not image_url and hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        # Get largest thumbnail
        thumbnails = []
        for thumb in entry.media_thumbnail:
            width = int(thumb.get('width', 0) or 0)
            thumbnails.append((width, thumb.get('url')))
        if thumbnails:
            thumbnails.sort(reverse=True)
            image_url = thumbnails[0][1]
    
    # Try enclosure
    if not image_url and hasattr(entry, 'enclosures') and entry.enclosures:
        for enc in entry.enclosures:
            if enc.get('type', '').startswith('image'):
                image_url = enc.get('href') or enc.get('url')
                break
    
    # Try links
    if not image_url and hasattr(entry, 'links'):
        for link in entry.links:
            if link.get('type', '').startswith('image'):
                image_url = link.get('href')
                break
    
    # Upgrade to higher quality if possible
    if image_url:
        image_url = get_best_image_url(image_url)
        if not is_high_quality_image(image_url):
            return None  # Reject low quality images
    
    return image_url

async def scrape_article_image(url: str) -> Optional[str]:
    """Scrape article page to find a high-quality image with multiple fallback strategies"""
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            })
            response.raise_for_status()
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Strategy 1: Open Graph image (most reliable, usually high quality)
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            img_url = og_image['content']
            # Make absolute URL if needed
            if img_url.startswith('//'):
                img_url = 'https:' + img_url
            elif img_url.startswith('/'):
                from urllib.parse import urlparse
                parsed = urlparse(url)
                img_url = f"{parsed.scheme}://{parsed.netloc}{img_url}"
            if is_high_quality_image(img_url):
                return get_best_image_url(img_url)
        
        # Strategy 2: Twitter card image
        twitter_image = soup.find('meta', {'name': 'twitter:image'})
        if not twitter_image:
            twitter_image = soup.find('meta', {'name': 'twitter:image:src'})
        if twitter_image and twitter_image.get('content'):
            img_url = twitter_image['content']
            if img_url.startswith('//'):
                img_url = 'https:' + img_url
            elif img_url.startswith('/'):
                from urllib.parse import urlparse
                parsed = urlparse(url)
                img_url = f"{parsed.scheme}://{parsed.netloc}{img_url}"
            if is_high_quality_image(img_url):
                return get_best_image_url(img_url)
        
        # Strategy 3: Schema.org image
        schema_image = soup.find('meta', {'itemprop': 'image'})
        if schema_image and schema_image.get('content'):
            img_url = schema_image['content']
            if img_url.startswith('//'):
                img_url = 'https:' + img_url
            elif img_url.startswith('/'):
                from urllib.parse import urlparse
                parsed = urlparse(url)
                img_url = f"{parsed.scheme}://{parsed.netloc}{img_url}"
            if is_high_quality_image(img_url):
                return get_best_image_url(img_url)
        
        # Strategy 4: Find largest image in article body
        article = soup.find('article')
        if article:
            images = article.find_all('img', src=True)
            best_img = None
            best_size = 0
            for img in images:
                img_url = img.get('src', '')
                # Skip base64 images and tracking pixels
                if img_url.startswith('data:') or 'pixel' in img_url.lower():
                    continue
                # Try to determine image size from attributes
                width = img.get('width', 0)
                height = img.get('height', 0)
                try:
                    size = int(width or 0) * int(height or 0)
                except:
                    size = 0
                # Also check for lazy loaded images
                lazy_src = img.get('data-src') or img.get('data-lazy-src') or img.get('data-original')
                if lazy_src:
                    img_url = lazy_src
                if size > best_size or (best_size == 0 and is_high_quality_image(img_url)):
                    best_size = size
                    best_img = img_url
            
            if best_img:
                if best_img.startswith('//'):
                    best_img = 'https:' + best_img
                elif best_img.startswith('/'):
                    from urllib.parse import urlparse
                    parsed = urlparse(url)
                    best_img = f"{parsed.scheme}://{parsed.netloc}{best_img}"
                return get_best_image_url(best_img)
        
        # Strategy 5: Find any large image in main content
        main = soup.find('main') or soup.find('[role="main"]') or soup.find('body')
        if main:
            images = main.find_all('img', src=True)
            for img in images:
                img_url = img.get('src', '')
                # Check for lazy loaded source
                lazy_src = img.get('data-src') or img.get('data-lazy-src') or img.get('data-original')
                if lazy_src:
                    img_url = lazy_src
                # Skip base64 and tracking pixels
                if img_url.startswith('data:') or 'pixel' in img_url.lower() or 'logo' in img_url.lower():
                    continue
                if is_high_quality_image(img_url):
                    if img_url.startswith('//'):
                        img_url = 'https:' + img_url
                    elif img_url.startswith('/'):
                        from urllib.parse import urlparse
                        parsed = urlparse(url)
                        img_url = f"{parsed.scheme}://{parsed.netloc}{img_url}"
                    return get_best_image_url(img_url)
                    
    except Exception as e:
        print(f"Error scraping image from {url}: {str(e)}")
    
    return None

async def scrape_article_content(url: str) -> Optional[str]:
    """Scrape article content from the URL to get fuller description"""
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove unwanted elements
        for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'form', 'iframe']):
            element.decompose()
        
        # Try to find article content using common selectors
        content = None
        
        # Try article tag first
        article = soup.find('article')
        if article:
            paragraphs = article.find_all('p')
            if paragraphs:
                content = ' '.join([p.get_text(strip=True) for p in paragraphs[:5]])
        
        # Try common content class names
        if not content or len(content) < 100:
            for selector in ['.article-body', '.story-body', '.post-content', '.entry-content', 
                           '.article__body', '.ssrcss-11r1m41-RichTextComponentWrapper', 
                           '[data-component="text-block"]', '.article-text']:
                body = soup.select_one(selector)
                if body:
                    paragraphs = body.find_all('p')
                    if paragraphs:
                        content = ' '.join([p.get_text(strip=True) for p in paragraphs[:5]])
                        break
        
        # Fallback: get main paragraphs
        if not content or len(content) < 100:
            main = soup.find('main') or soup.find('body')
            if main:
                paragraphs = main.find_all('p')
                # Filter out short paragraphs (likely navigation, etc)
                good_paragraphs = [p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 50]
                content = ' '.join(good_paragraphs[:5])
        
        if content:
            # Clean up the content
            content = re.sub(r'\s+', ' ', content).strip()
            # Limit to reasonable length (500 chars)
            if len(content) > 500:
                # Try to cut at sentence boundary
                sentences = content[:550].split('. ')
                content = '. '.join(sentences[:-1]) + '.' if len(sentences) > 1 else content[:500] + '...'
            return content
            
    except Exception as e:
        print(f"Error scraping {url}: {str(e)}")
    
    return None

async def fetch_rss_feed(url: str, source: str, category: str) -> List[NewsArticle]:
    """Fetch and parse a single RSS feed"""
    articles = []
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; EuroNewsApp/1.0)'
            })
            response.raise_for_status()
            
        feed = feedparser.parse(response.text)
        
        # Collect entries for processing
        entries_data = []
        for entry in feed.entries[:10]:  # Limit to 10 articles per feed
            title = entry.get('title', 'No Title')
            link = entry.get('link', '')
            description = entry.get('summary', entry.get('description', ''))
            
            # Clean description (remove HTML tags)
            if description:
                description = re.sub(r'<[^>]+>', '', description)
                description = description.strip()
            
            # Parse published date
            published = entry.get('published', entry.get('updated', ''))
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                try:
                    published = datetime(*entry.published_parsed[:6]).isoformat()
                except:
                    pass
            
            image_url = extract_image_from_entry(entry)
            
            entries_data.append({
                'title': title,
                'link': link,
                'description': description,
                'published': published,
                'image_url': image_url,
                'needs_scraping': len(description) < MIN_DESCRIPTION_LENGTH
            })
        
        # Scrape content for articles with short descriptions (limit to 3 per feed to avoid slowdown)
        scrape_tasks = []
        scrape_indices = []
        for i, entry in enumerate(entries_data):
            if entry['needs_scraping'] and len(scrape_tasks) < 3:
                scrape_tasks.append(scrape_article_content(entry['link']))
                scrape_indices.append(i)
        
        if scrape_tasks:
            scraped_contents = await asyncio.gather(*scrape_tasks, return_exceptions=True)
            for idx, content in zip(scrape_indices, scraped_contents):
                if content and not isinstance(content, Exception):
                    entries_data[idx]['description'] = content
        
        # Scrape images for articles without images (increased to 8 per feed for better coverage)
        image_scrape_tasks = []
        image_scrape_indices = []
        for i, entry in enumerate(entries_data):
            if not entry['image_url'] and len(image_scrape_tasks) < 8:
                image_scrape_tasks.append(scrape_article_image(entry['link']))
                image_scrape_indices.append(i)
        
        if image_scrape_tasks:
            scraped_images = await asyncio.gather(*image_scrape_tasks, return_exceptions=True)
            for idx, img_url in zip(image_scrape_indices, scraped_images):
                if img_url and not isinstance(img_url, Exception):
                    entries_data[idx]['image_url'] = img_url
        
        # Create articles - include articles with images OR use fallback
        for entry in entries_data:
            # Use fallback image if no image found
            image_url = entry['image_url'] or FALLBACK_IMAGE_URL
            
            # Clean the description first (remove junk)
            description = clean_description(entry['description'])
            
            # Validate content relevance with cleaned description
            if not is_content_relevant(entry['title'], description):
                print(f"Skipping irrelevant content: {entry['title'][:50]}...")
                continue
            
            # Skip if description is too short after cleaning
            if len(description) < 50:
                print(f"Skipping too-short content: {entry['title'][:50]}...")
                continue
            
            # Limit to 500 chars, cut at sentence boundary
            if len(description) > 500:
                sentences = description[:520].split('. ')
                description = '. '.join(sentences[:-1]) + '.' if len(sentences) > 1 else description[:500] + '...'
            
            article = NewsArticle(
                id=generate_article_id(entry['title'], entry['link']),
                title=entry['title'],
                description=description,
                link=entry['link'],
                published=entry['published'],
                source=source,
                category=category,
                image_url=image_url  # Use the variable with fallback
            )
            articles.append(article)
            
    except Exception as e:
        print(f"Error fetching {url}: {str(e)}")
    
    return articles

async def get_news_by_category(category: str) -> List[NewsArticle]:
    """Get all news for a specific category"""
    cache_key = f"news_{category}"
    current_time = time.time()
    
    # Check cache
    if cache_key in NEWS_CACHE:
        cached_data, cached_time = NEWS_CACHE[cache_key]
        if current_time - cached_time < CACHE_DURATION:
            return cached_data
    
    # Fetch from RSS feeds
    feeds = RSS_FEEDS.get(category.lower(), [])
    if not feeds:
        return []
    
    tasks = [fetch_rss_feed(feed['url'], feed['source'], category) for feed in feeds]
    results = await asyncio.gather(*tasks)
    
    # Flatten results and sort by date
    articles = []
    for result in results:
        articles.extend(result)
    
    # Sort by published date (newest first)
    articles.sort(key=lambda x: x.published, reverse=True)
    
    # Cache results
    NEWS_CACHE[cache_key] = (articles, current_time)
    
    return articles

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Verityn News API"}

@app.get("/api/categories")
async def get_categories():
    """Get all available news categories"""
    categories = [
        {"id": "politics", "name": "Politics", "icon": "landmark", "color": "#3B82F6"},
        {"id": "business", "name": "Business", "icon": "briefcase", "color": "#10B981"},
        {"id": "technology", "name": "Technology", "icon": "cpu", "color": "#8B5CF6"},
        {"id": "sports", "name": "Sports", "icon": "trophy", "color": "#F59E0B"},
        {"id": "entertainment", "name": "Entertainment", "icon": "film", "color": "#EC4899"},
        {"id": "health", "name": "Health", "icon": "heart", "color": "#EF4444"},
        {"id": "science", "name": "Science", "icon": "flask", "color": "#06B6D4"},
    ]
    return {"categories": categories}

@app.get("/api/news/{category}", response_model=NewsResponse)
async def get_news(category: str, limit: int = Query(default=20, le=50)):
    """Get news articles for a specific category"""
    valid_categories = list(RSS_FEEDS.keys())
    if category.lower() not in valid_categories:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category. Valid categories: {', '.join(valid_categories)}"
        )
    
    articles = await get_news_by_category(category.lower())
    return NewsResponse(
        articles=articles[:limit],
        total=len(articles),
        category=category
    )

@app.get("/api/news")
async def get_news_multiple(
    categories: str = Query(..., description="Comma-separated list of categories"),
    limit: int = Query(default=30, le=100)
):
    """Get news from multiple categories"""
    category_list = [c.strip().lower() for c in categories.split(',')]
    valid_categories = list(RSS_FEEDS.keys())
    
    # Filter valid categories
    category_list = [c for c in category_list if c in valid_categories]
    
    if not category_list:
        raise HTTPException(
            status_code=400,
            detail=f"No valid categories provided. Valid categories: {', '.join(valid_categories)}"
        )
    
    # Fetch all categories concurrently
    tasks = [get_news_by_category(cat) for cat in category_list]
    results = await asyncio.gather(*tasks)
    
    # Combine and sort all articles
    all_articles = []
    for result in results:
        all_articles.extend(result)
    
    # Sort by date and remove duplicates
    seen_ids = set()
    unique_articles = []
    for article in sorted(all_articles, key=lambda x: x.published, reverse=True):
        if article.id not in seen_ids:
            seen_ids.add(article.id)
            unique_articles.append(article)
    
    return {
        "articles": unique_articles[:limit],
        "total": len(unique_articles),
        "categories": category_list
    }

@app.get("/api/sources")
async def get_sources():
    """Get all available news sources grouped by category"""
    sources = {}
    for category, feeds in RSS_FEEDS.items():
        sources[category] = [feed['source'] for feed in feeds]
    return {"sources": sources}

@app.get("/api/search")
async def search_news(
    q: str = Query(..., min_length=2, description="Search query"),
    categories: Optional[str] = Query(default=None, description="Comma-separated list of categories to search in"),
    limit: int = Query(default=30, le=100)
):
    """Search news articles by keyword in title and description"""
    query = q.lower().strip()
    
    # Determine which categories to search
    if categories:
        category_list = [c.strip().lower() for c in categories.split(',')]
        valid_categories = list(RSS_FEEDS.keys())
        category_list = [c for c in category_list if c in valid_categories]
    else:
        category_list = list(RSS_FEEDS.keys())
    
    if not category_list:
        raise HTTPException(
            status_code=400,
            detail="No valid categories to search in"
        )
    
    # Fetch all articles from selected categories
    tasks = [get_news_by_category(cat) for cat in category_list]
    results = await asyncio.gather(*tasks)
    
    # Combine all articles
    all_articles = []
    for result in results:
        all_articles.extend(result)
    
    # Search in title and description
    matching_articles = []
    seen_ids = set()
    
    for article in all_articles:
        if article.id in seen_ids:
            continue
        
        title_match = query in article.title.lower()
        desc_match = query in article.description.lower()
        
        if title_match or desc_match:
            seen_ids.add(article.id)
            matching_articles.append(article)
    
    # Sort by date
    matching_articles.sort(key=lambda x: x.published, reverse=True)
    
    return {
        "articles": matching_articles[:limit],
        "total": len(matching_articles),
        "query": q,
        "categories_searched": category_list
    }


@app.get("/api/location-news")
async def get_location_news(
    countries: str = Query(..., description="Comma-separated list of country IDs (e.g., uk,germany,france)"),
    cities: Optional[str] = Query(default=None, description="Comma-separated list of cities to filter by"),
    limit: int = Query(default=50, le=100)
):
    """Get news filtered by European countries and optionally cities"""
    country_list = [c.strip().lower() for c in countries.split(',')]
    city_list = [c.strip().lower() for c in cities.split(',')] if cities else []
    
    # Validate countries
    valid_countries = [c for c in country_list if c in REGIONAL_RSS_FEEDS]
    
    if not valid_countries:
        # Fallback: try to get general European news and filter by country name
        all_articles = []
        tasks = [get_news_by_category(cat) for cat in ['politics', 'business', 'technology']]
        results = await asyncio.gather(*tasks)
        for result in results:
            all_articles.extend(result)
        
        # Filter by country keywords
        filtered = []
        seen_ids = set()
        for article in all_articles:
            if article.id in seen_ids:
                continue
            text = f"{article.title} {article.description}".lower()
            for country_id in country_list:
                if country_id in text:
                    seen_ids.add(article.id)
                    filtered.append(article)
                    break
        
        filtered.sort(key=lambda x: x.published, reverse=True)
        return {
            "articles": filtered[:limit],
            "total": len(filtered),
            "countries": country_list,
            "cities": city_list,
            "source": "keyword_filter"
        }
    
    # Fetch from regional feeds
    all_articles = []
    
    async def fetch_regional_feed(feed_info: dict, country_id: str):
        """Fetch articles from a regional RSS feed"""
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(feed_info['url'], headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                response.raise_for_status()
                feed = feedparser.parse(response.text)
                
                articles = []
                for entry in feed.entries[:20]:
                    try:
                        title = entry.get('title', '').strip()
                        description = entry.get('summary', entry.get('description', '')).strip()
                        link = entry.get('link', '')
                        
                        # Clean HTML from description
                        if description:
                            soup = BeautifulSoup(description, 'html.parser')
                            description = soup.get_text(separator=' ', strip=True)
                            description = clean_description(description)
                        
                        # Parse date
                        published = entry.get('published', entry.get('updated', ''))
                        try:
                            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                                pub_datetime = datetime(*entry.published_parsed[:6])
                                published = pub_datetime.isoformat()
                        except:
                            published = datetime.now().isoformat()
                        
                        # Get image
                        image_url = None
                        if 'media_content' in entry:
                            for media in entry.media_content:
                                if 'url' in media:
                                    image_url = media['url']
                                    break
                        if not image_url and 'media_thumbnail' in entry:
                            for thumb in entry.media_thumbnail:
                                if 'url' in thumb:
                                    image_url = thumb['url']
                                    break
                        if not image_url and 'enclosures' in entry:
                            for enc in entry.enclosures:
                                if enc.get('type', '').startswith('image'):
                                    image_url = enc.get('url')
                                    break
                        
                        article_id = hashlib.md5(f"{title}{link}".encode()).hexdigest()
                        
                        articles.append(NewsArticle(
                            id=article_id,
                            title=title,
                            description=description[:500] if description else "No description available.",
                            link=link,
                            published=published,
                            source=feed_info['source'],
                            category=country_id,
                            image_url=image_url
                        ))
                    except Exception as e:
                        continue
                
                return articles
        except Exception as e:
            print(f"Error fetching regional feed {feed_info['url']}: {e}")
            return []
    
    # Create tasks for all regional feeds
    tasks = []
    for country_id in valid_countries:
        for feed_info in REGIONAL_RSS_FEEDS.get(country_id, []):
            tasks.append(fetch_regional_feed(feed_info, country_id))
    
    # Execute all tasks
    results = await asyncio.gather(*tasks)
    for result in results:
        all_articles.extend(result)
    
    # Also search general feeds for country/city mentions
    general_tasks = [get_news_by_category(cat) for cat in ['politics', 'business']]
    general_results = await asyncio.gather(*general_tasks)
    general_articles = []
    for result in general_results:
        general_articles.extend(result)
    
    # Filter general articles by location keywords
    seen_ids = set(a.id for a in all_articles)
    for article in general_articles:
        if article.id in seen_ids:
            continue
        text = f"{article.title} {article.description}".lower()
        
        # Check country match
        country_match = False
        for country_id in valid_countries:
            if country_id in text:
                country_match = True
                break
        
        # Check city match if cities specified
        city_match = not city_list  # If no cities specified, don't filter by city
        if city_list:
            for city in city_list:
                city_keywords = CITY_KEYWORDS.get(city.lower(), [city.lower()])
                for keyword in city_keywords:
                    if keyword in text:
                        city_match = True
                        break
                if city_match:
                    break
        
        if country_match or city_match:
            seen_ids.add(article.id)
            all_articles.append(article)
    
    # If cities are specified, filter all articles by city
    if city_list:
        city_filtered = []
        for article in all_articles:
            text = f"{article.title} {article.description}".lower()
            for city in city_list:
                city_keywords = CITY_KEYWORDS.get(city.lower(), [city.lower()])
                for keyword in city_keywords:
                    if keyword in text:
                        city_filtered.append(article)
                        break
                else:
                    continue
                break
        # If city filtering returns too few results, include country-level articles
        if len(city_filtered) >= 5:
            all_articles = city_filtered
    
    # Remove duplicates and sort
    unique_articles = []
    seen_ids = set()
    for article in all_articles:
        if article.id not in seen_ids:
            seen_ids.add(article.id)
            unique_articles.append(article)
    
    unique_articles.sort(key=lambda x: x.published, reverse=True)
    
    return {
        "articles": unique_articles[:limit],
        "total": len(unique_articles),
        "countries": valid_countries,
        "cities": city_list,
        "source": "regional_feeds"
    }


@app.get("/api/locations/available")
async def get_available_locations():
    """Get list of available European countries and their cities"""
    locations = []
    country_data = {
        "uk": {"name": "United Kingdom", "flag": "🇬🇧", "cities": ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Liverpool", "Bristol", "Leeds"]},
        "germany": {"name": "Germany", "flag": "🇩🇪", "cities": ["Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne", "Stuttgart", "Düsseldorf", "Leipzig"]},
        "france": {"name": "France", "flag": "🇫🇷", "cities": ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Bordeaux", "Strasbourg", "Lille"]},
        "spain": {"name": "Spain", "flag": "🇪🇸", "cities": ["Madrid", "Barcelona", "Valencia", "Seville", "Bilbao", "Malaga", "Zaragoza"]},
        "italy": {"name": "Italy", "flag": "🇮🇹", "cities": ["Rome", "Milan", "Naples", "Turin", "Florence", "Venice", "Bologna", "Palermo"]},
        "netherlands": {"name": "Netherlands", "flag": "🇳🇱", "cities": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"]},
        "belgium": {"name": "Belgium", "flag": "🇧🇪", "cities": ["Brussels", "Antwerp", "Ghent", "Bruges", "Liège"]},
        "switzerland": {"name": "Switzerland", "flag": "🇨🇭", "cities": ["Zurich", "Geneva", "Basel", "Bern", "Lausanne"]},
        "austria": {"name": "Austria", "flag": "🇦🇹", "cities": ["Vienna", "Salzburg", "Innsbruck", "Graz", "Linz"]},
        "portugal": {"name": "Portugal", "flag": "🇵🇹", "cities": ["Lisbon", "Porto", "Braga", "Faro", "Coimbra"]},
        "ireland": {"name": "Ireland", "flag": "🇮🇪", "cities": ["Dublin", "Cork", "Galway", "Limerick", "Waterford"]},
        "sweden": {"name": "Sweden", "flag": "🇸🇪", "cities": ["Stockholm", "Gothenburg", "Malmö", "Uppsala"]},
        "norway": {"name": "Norway", "flag": "🇳🇴", "cities": ["Oslo", "Bergen", "Trondheim", "Stavanger"]},
        "denmark": {"name": "Denmark", "flag": "🇩🇰", "cities": ["Copenhagen", "Aarhus", "Odense", "Aalborg"]},
        "finland": {"name": "Finland", "flag": "🇫🇮", "cities": ["Helsinki", "Espoo", "Tampere", "Turku"]},
        "poland": {"name": "Poland", "flag": "🇵🇱", "cities": ["Warsaw", "Krakow", "Gdansk", "Wroclaw", "Poznan"]},
        "czechia": {"name": "Czech Republic", "flag": "🇨🇿", "cities": ["Prague", "Brno", "Ostrava", "Pilsen"]},
        "greece": {"name": "Greece", "flag": "🇬🇷", "cities": ["Athens", "Thessaloniki", "Patras", "Heraklion"]},
    }
    
    for country_id, data in country_data.items():
        locations.append({
            "id": country_id,
            "name": data["name"],
            "flag": data["flag"],
            "cities": data["cities"],
            "has_regional_feeds": country_id in REGIONAL_RSS_FEEDS
        })
    
    return {"locations": locations}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
