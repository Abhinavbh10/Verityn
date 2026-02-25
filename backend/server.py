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
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="European News RSS API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# European RSS Feed Sources organized by category
RSS_FEEDS = {
    "politics": [
        {"url": "http://feeds.bbci.co.uk/news/politics/rss.xml", "source": "BBC Politics"},
        {"url": "https://www.theguardian.com/politics/rss", "source": "The Guardian Politics"},
        {"url": "https://rss.dw.com/rdf/rss-en-eu", "source": "DW Europe"},
        {"url": "https://www.euronews.com/rss?level=theme&name=news", "source": "Euronews"},
        {"url": "https://www.politico.eu/feed/", "source": "Politico EU"},
    ],
    "business": [
        {"url": "http://feeds.bbci.co.uk/news/business/rss.xml", "source": "BBC Business"},
        {"url": "https://www.theguardian.com/uk/business/rss", "source": "The Guardian Business"},
        {"url": "https://rss.dw.com/rdf/rss-en-bus", "source": "DW Business"},
        {"url": "https://feeds.skynews.com/feeds/rss/business.xml", "source": "Sky News Business"},
        {"url": "https://www.ft.com/rss/home/uk", "source": "Financial Times"},
    ],
    "technology": [
        {"url": "http://feeds.bbci.co.uk/news/technology/rss.xml", "source": "BBC Technology"},
        {"url": "https://www.theguardian.com/uk/technology/rss", "source": "The Guardian Tech"},
        {"url": "https://rss.dw.com/rdf/rss-en-sci", "source": "DW Science & Tech"},
        {"url": "https://www.wired.co.uk/feed/rss", "source": "Wired UK"},
    ],
    "sports": [
        {"url": "http://feeds.bbci.co.uk/sport/rss.xml", "source": "BBC Sport"},
        {"url": "https://www.theguardian.com/uk/sport/rss", "source": "The Guardian Sport"},
        {"url": "https://feeds.skynews.com/feeds/rss/sports.xml", "source": "Sky News Sport"},
        {"url": "https://www.euronews.com/rss?level=theme&name=sport", "source": "Euronews Sport"},
    ],
    "entertainment": [
        {"url": "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", "source": "BBC Entertainment"},
        {"url": "https://www.theguardian.com/uk/culture/rss", "source": "The Guardian Culture"},
        {"url": "https://rss.dw.com/rdf/rss-en-cul", "source": "DW Culture"},
        {"url": "https://www.euronews.com/rss?level=theme&name=culture", "source": "Euronews Culture"},
    ],
    "health": [
        {"url": "http://feeds.bbci.co.uk/news/health/rss.xml", "source": "BBC Health"},
        {"url": "https://www.theguardian.com/lifeandstyle/health-and-wellbeing/rss", "source": "The Guardian Health"},
        {"url": "https://rss.dw.com/rdf/rss-en-health", "source": "DW Health"},
    ],
    "science": [
        {"url": "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml", "source": "BBC Science"},
        {"url": "https://www.theguardian.com/science/rss", "source": "The Guardian Science"},
        {"url": "https://rss.dw.com/rdf/rss-en-sci", "source": "DW Science"},
        {"url": "https://www.newscientist.com/feed/home/", "source": "New Scientist"},
    ],
}

# Simple in-memory cache
NEWS_CACHE = {}
CACHE_DURATION = 300  # 5 minutes

def generate_article_id(title: str, link: str) -> str:
    """Generate a unique ID for an article"""
    content = f"{title}{link}"
    return hashlib.md5(content.encode()).hexdigest()[:12]

def extract_image_from_entry(entry) -> Optional[str]:
    """Extract image URL from RSS entry"""
    # Try media:thumbnail
    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        return entry.media_thumbnail[0].get('url')
    
    # Try media:content
    if hasattr(entry, 'media_content') and entry.media_content:
        for media in entry.media_content:
            if media.get('medium') == 'image' or media.get('type', '').startswith('image'):
                return media.get('url')
    
    # Try enclosure
    if hasattr(entry, 'enclosures') and entry.enclosures:
        for enc in entry.enclosures:
            if enc.get('type', '').startswith('image'):
                return enc.get('href') or enc.get('url')
    
    # Try links
    if hasattr(entry, 'links'):
        for link in entry.links:
            if link.get('type', '').startswith('image'):
                return link.get('href')
    
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
        
        for entry in feed.entries[:10]:  # Limit to 10 articles per feed
            title = entry.get('title', 'No Title')
            link = entry.get('link', '')
            description = entry.get('summary', entry.get('description', ''))
            
            # Clean description (remove HTML tags)
            if description:
                import re
                description = re.sub(r'<[^>]+>', '', description)
                description = description[:300] + '...' if len(description) > 300 else description
            
            # Parse published date
            published = entry.get('published', entry.get('updated', ''))
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                try:
                    published = datetime(*entry.published_parsed[:6]).isoformat()
                except:
                    pass
            
            image_url = extract_image_from_entry(entry)
            
            article = NewsArticle(
                id=generate_article_id(title, link),
                title=title,
                description=description,
                link=link,
                published=published,
                source=source,
                category=category,
                image_url=image_url
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
    return {"status": "healthy", "service": "European News RSS API"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
