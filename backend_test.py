#!/usr/bin/env python3
"""
European News RSS API Backend Test Suite
Tests all backend endpoints for the European news aggregation system
"""

import requests
import json
import sys
from typing import Dict, List, Any
import time

# Backend URL from frontend/.env
BACKEND_URL = "https://news-feed-eu.preview.emergentagent.com/api"

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []
        
    def add_result(self, test_name: str, passed: bool, message: str, details: Any = None):
        self.results.append({
            'test': test_name,
            'passed': passed,
            'message': message,
            'details': details
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1
            
    def print_summary(self):
        print(f"\n{'='*50}")
        print(f"TEST SUMMARY")
        print(f"{'='*50}")
        print(f"Total Tests: {self.passed + self.failed}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {(self.passed / (self.passed + self.failed) * 100):.1f}%")
        
        if self.failed > 0:
            print(f"\nFAILED TESTS:")
            for result in self.results:
                if not result['passed']:
                    print(f"❌ {result['test']}: {result['message']}")
        
        print(f"\nDETAILED RESULTS:")
        for result in self.results:
            status = "✅" if result['passed'] else "❌"
            print(f"{status} {result['test']}: {result['message']}")

def test_health_endpoint(test_result: TestResult):
    """Test GET /api/health endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        
        if response.status_code != 200:
            test_result.add_result(
                "Health Check", False, 
                f"Expected status 200, got {response.status_code}",
                response.text
            )
            return
            
        data = response.json()
        
        if "status" in data and data["status"] == "healthy":
            test_result.add_result(
                "Health Check", True, 
                "Health endpoint returned healthy status"
            )
        else:
            test_result.add_result(
                "Health Check", False, 
                f"Health endpoint returned unexpected response: {data}"
            )
            
    except Exception as e:
        test_result.add_result(
            "Health Check", False, 
            f"Request failed: {str(e)}"
        )

def test_categories_endpoint(test_result: TestResult):
    """Test GET /api/categories endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/categories", timeout=10)
        
        if response.status_code != 200:
            test_result.add_result(
                "Categories Endpoint", False, 
                f"Expected status 200, got {response.status_code}",
                response.text
            )
            return
            
        data = response.json()
        
        # Check if response has categories
        if "categories" not in data:
            test_result.add_result(
                "Categories Endpoint", False, 
                "Response missing 'categories' field",
                data
            )
            return
            
        categories = data["categories"]
        
        # Check if we have 7 categories
        if len(categories) != 7:
            test_result.add_result(
                "Categories Count", False, 
                f"Expected 7 categories, got {len(categories)}",
                categories
            )
        else:
            test_result.add_result(
                "Categories Count", True, 
                "Returns exactly 7 categories"
            )
            
        # Check category structure
        expected_categories = ["politics", "business", "technology", "sports", "entertainment", "health", "science"]
        category_ids = [cat.get("id") for cat in categories]
        
        missing_categories = [cat for cat in expected_categories if cat not in category_ids]
        if missing_categories:
            test_result.add_result(
                "Categories Content", False, 
                f"Missing categories: {missing_categories}",
                category_ids
            )
        else:
            test_result.add_result(
                "Categories Content", True, 
                "All expected categories present"
            )
            
        # Check category structure
        required_fields = ["id", "name", "icon", "color"]
        for cat in categories:
            for field in required_fields:
                if field not in cat:
                    test_result.add_result(
                        "Category Structure", False, 
                        f"Category missing required field '{field}'",
                        cat
                    )
                    return
                    
        test_result.add_result(
            "Category Structure", True, 
            "All categories have required fields"
        )
        
    except Exception as e:
        test_result.add_result(
            "Categories Endpoint", False, 
            f"Request failed: {str(e)}"
        )

def test_single_category_news(test_result: TestResult, category: str = "technology"):
    """Test GET /api/news/{category} endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/news/{category}", timeout=30)
        
        if response.status_code != 200:
            test_result.add_result(
                f"News by Category ({category})", False, 
                f"Expected status 200, got {response.status_code}",
                response.text
            )
            return
            
        data = response.json()
        
        # Check response structure
        required_fields = ["articles", "total", "category"]
        for field in required_fields:
            if field not in data:
                test_result.add_result(
                    f"News Response Structure ({category})", False, 
                    f"Response missing required field '{field}'",
                    data
                )
                return
                
        test_result.add_result(
            f"News Response Structure ({category})", True, 
            "Response has all required fields"
        )
        
        articles = data["articles"]
        
        if len(articles) == 0:
            test_result.add_result(
                f"News Articles Count ({category})", False, 
                "No articles returned - RSS feeds might be down",
                data
            )
            return
            
        # Check first article structure
        article = articles[0]
        required_article_fields = ["id", "title", "description", "link", "published", "source", "category"]
        
        for field in required_article_fields:
            if field not in article:
                test_result.add_result(
                    f"Article Structure ({category})", False, 
                    f"Article missing required field '{field}'",
                    article
                )
                return
                
        test_result.add_result(
            f"Article Structure ({category})", True, 
            f"Articles have correct structure (found {len(articles)} articles)"
        )
        
        # Verify category matches
        if article["category"] != category:
            test_result.add_result(
                f"Category Consistency ({category})", False, 
                f"Article category '{article['category']}' doesn't match requested '{category}'"
            )
        else:
            test_result.add_result(
                f"Category Consistency ({category})", True, 
                "Article categories match request"
            )
        
    except Exception as e:
        test_result.add_result(
            f"News by Category ({category})", False, 
            f"Request failed: {str(e)}"
        )

def test_multiple_categories_news(test_result: TestResult):
    """Test GET /api/news?categories=technology,business&limit=5 endpoint"""
    try:
        params = {
            "categories": "technology,business", 
            "limit": 5
        }
        response = requests.get(f"{BACKEND_URL}/news", params=params, timeout=45)
        
        if response.status_code != 200:
            test_result.add_result(
                "Multiple Categories News", False, 
                f"Expected status 200, got {response.status_code}",
                response.text
            )
            return
            
        data = response.json()
        
        # Check response structure
        required_fields = ["articles", "total", "categories"]
        for field in required_fields:
            if field not in data:
                test_result.add_result(
                    "Multiple Categories Response Structure", False, 
                    f"Response missing required field '{field}'",
                    data
                )
                return
                
        test_result.add_result(
            "Multiple Categories Response Structure", True, 
            "Response has all required fields"
        )
        
        articles = data["articles"]
        
        if len(articles) == 0:
            test_result.add_result(
                "Multiple Categories Articles", False, 
                "No articles returned - RSS feeds might be down",
                data
            )
            return
            
        # Check limit is respected
        if len(articles) > 5:
            test_result.add_result(
                "Multiple Categories Limit", False, 
                f"Expected max 5 articles, got {len(articles)}"
            )
        else:
            test_result.add_result(
                "Multiple Categories Limit", True, 
                f"Limit respected (got {len(articles)} articles)"
            )
            
        # Check categories in response
        expected_categories = ["technology", "business"]
        returned_categories = data["categories"]
        
        if set(returned_categories) != set(expected_categories):
            test_result.add_result(
                "Multiple Categories List", False, 
                f"Expected categories {expected_categories}, got {returned_categories}"
            )
        else:
            test_result.add_result(
                "Multiple Categories List", True, 
                "Correct categories returned"
            )
            
        # Check article categories
        article_categories = [article["category"] for article in articles]
        invalid_categories = [cat for cat in article_categories if cat not in expected_categories]
        
        if invalid_categories:
            test_result.add_result(
                "Multiple Categories Article Categories", False, 
                f"Found articles with unexpected categories: {set(invalid_categories)}"
            )
        else:
            test_result.add_result(
                "Multiple Categories Article Categories", True, 
                "All articles belong to requested categories"
            )
        
    except Exception as e:
        test_result.add_result(
            "Multiple Categories News", False, 
            f"Request failed: {str(e)}"
        )

def test_sources_endpoint(test_result: TestResult):
    """Test GET /api/sources endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/sources", timeout=10)
        
        if response.status_code != 200:
            test_result.add_result(
                "Sources Endpoint", False, 
                f"Expected status 200, got {response.status_code}",
                response.text
            )
            return
            
        data = response.json()
        
        # Check if response has sources
        if "sources" not in data:
            test_result.add_result(
                "Sources Response Structure", False, 
                "Response missing 'sources' field",
                data
            )
            return
            
        sources = data["sources"]
        
        # Check expected categories
        expected_categories = ["politics", "business", "technology", "sports", "entertainment", "health", "science"]
        
        for category in expected_categories:
            if category not in sources:
                test_result.add_result(
                    "Sources Categories", False, 
                    f"Missing sources for category '{category}'",
                    sources
                )
                return
                
        test_result.add_result(
            "Sources Categories", True, 
            "All categories have source listings"
        )
        
        # Check expected sources are present
        expected_sources = ["BBC", "Guardian", "DW", "Euronews", "Politico EU", "Financial Times", "Sky News"]
        all_sources = []
        for cat_sources in sources.values():
            all_sources.extend(cat_sources)
            
        found_sources = []
        for expected in expected_sources:
            if any(expected in source for source in all_sources):
                found_sources.append(expected)
                
        if len(found_sources) < 5:  # At least 5 major sources should be found
            test_result.add_result(
                "Expected News Sources", False, 
                f"Only found {len(found_sources)} of expected sources: {found_sources}",
                all_sources
            )
        else:
            test_result.add_result(
                "Expected News Sources", True, 
                f"Found {len(found_sources)} expected sources: {found_sources}"
            )
        
    except Exception as e:
        test_result.add_result(
            "Sources Endpoint", False, 
            f"Request failed: {str(e)}"
        )

def test_invalid_category(test_result: TestResult):
    """Test error handling for invalid category"""
    try:
        response = requests.get(f"{BACKEND_URL}/news/invalid_category", timeout=10)
        
        if response.status_code == 400:
            test_result.add_result(
                "Invalid Category Error Handling", True, 
                "Correctly returns 400 for invalid category"
            )
        else:
            test_result.add_result(
                "Invalid Category Error Handling", False, 
                f"Expected status 400, got {response.status_code}",
                response.text
            )
        
    except Exception as e:
        test_result.add_result(
            "Invalid Category Error Handling", False, 
            f"Request failed: {str(e)}"
        )

def test_search_endpoint_basic(test_result: TestResult):
    """Test GET /api/search?q=climate - Should return articles containing 'climate'"""
    try:
        params = {"q": "climate"}
        response = requests.get(f"{BACKEND_URL}/search", params=params, timeout=30)
        
        if response.status_code != 200:
            test_result.add_result(
                "Search Basic (climate)", False, 
                f"Expected status 200, got {response.status_code}",
                response.text
            )
            return
            
        data = response.json()
        
        # Check response structure
        required_fields = ["articles", "total", "query", "categories_searched"]
        for field in required_fields:
            if field not in data:
                test_result.add_result(
                    "Search Response Structure", False, 
                    f"Response missing required field '{field}'",
                    data
                )
                return
                
        test_result.add_result(
            "Search Response Structure", True, 
            "Search response has all required fields"
        )
        
        # Check query field matches
        if data["query"] != "climate":
            test_result.add_result(
                "Search Query Field", False, 
                f"Query field should be 'climate', got '{data['query']}'"
            )
        else:
            test_result.add_result(
                "Search Query Field", True, 
                "Query field correctly returned"
            )
        
        articles = data["articles"]
        
        if len(articles) == 0:
            test_result.add_result(
                "Search Results (climate)", False, 
                "No articles found for 'climate' - might indicate RSS feeds issue or no recent climate articles"
            )
        else:
            # Verify articles contain the search term
            articles_with_climate = []
            for article in articles[:5]:  # Check first 5 articles
                if "climate" in article["title"].lower() or "climate" in article["description"].lower():
                    articles_with_climate.append(article["title"])
            
            if len(articles_with_climate) > 0:
                test_result.add_result(
                    "Search Results (climate)", True, 
                    f"Found {len(articles)} articles, verified {len(articles_with_climate)} contain 'climate'"
                )
            else:
                test_result.add_result(
                    "Search Results (climate)", False, 
                    f"Found {len(articles)} articles but none contain 'climate' in title/description"
                )
        
    except Exception as e:
        test_result.add_result(
            "Search Basic (climate)", False, 
            f"Request failed: {str(e)}"
        )

def test_search_endpoint_with_limit(test_result: TestResult):
    """Test GET /api/search?q=AI&limit=5 - Should return max 5 articles about AI"""
    try:
        params = {"q": "AI", "limit": 5}
        response = requests.get(f"{BACKEND_URL}/search", params=params, timeout=30)
        
        if response.status_code != 200:
            test_result.add_result(
                "Search with Limit (AI)", False, 
                f"Expected status 200, got {response.status_code}",
                response.text
            )
            return
            
        data = response.json()
        articles = data["articles"]
        
        # Check limit is respected
        if len(articles) > 5:
            test_result.add_result(
                "Search Limit Enforcement", False, 
                f"Expected max 5 articles, got {len(articles)}"
            )
        else:
            test_result.add_result(
                "Search Limit Enforcement", True, 
                f"Limit respected (got {len(articles)} articles)"
            )
        
        # Check query field matches
        if data["query"] != "AI":
            test_result.add_result(
                "Search Query (AI)", False, 
                f"Query field should be 'AI', got '{data['query']}'"
            )
        else:
            test_result.add_result(
                "Search Query (AI)", True, 
                "Query field correctly returned for AI search"
            )
        
        # If we got articles, verify they contain AI
        if len(articles) > 0:
            ai_articles = []
            for article in articles:
                if "ai" in article["title"].lower() or "ai" in article["description"].lower():
                    ai_articles.append(article["title"])
            
            if len(ai_articles) > 0:
                test_result.add_result(
                    "Search Content Match (AI)", True, 
                    f"Found {len(articles)} articles, {len(ai_articles)} contain 'AI'"
                )
            else:
                test_result.add_result(
                    "Search Content Match (AI)", False, 
                    f"Found {len(articles)} articles but none contain 'AI' in title/description"
                )
        else:
            test_result.add_result(
                "Search Results (AI)", False, 
                "No articles found for 'AI' - might indicate RSS feeds issue"
            )
        
    except Exception as e:
        test_result.add_result(
            "Search with Limit (AI)", False, 
            f"Request failed: {str(e)}"
        )

def test_search_endpoint_validation(test_result: TestResult):
    """Test GET /api/search?q=a - Should return 422 error (minimum 2 characters required)"""
    try:
        params = {"q": "a"}
        response = requests.get(f"{BACKEND_URL}/search", params=params, timeout=10)
        
        if response.status_code == 422:
            test_result.add_result(
                "Search Validation (min length)", True, 
                "Correctly returns 422 for single character query"
            )
        elif response.status_code == 400:
            test_result.add_result(
                "Search Validation (min length)", True, 
                "Returns 400 for single character query (acceptable error code)"
            )
        else:
            test_result.add_result(
                "Search Validation (min length)", False, 
                f"Expected status 422 or 400, got {response.status_code}",
                response.text
            )
        
    except Exception as e:
        test_result.add_result(
            "Search Validation (min length)", False, 
            f"Request failed: {str(e)}"
        )

def test_search_endpoint_with_categories(test_result: TestResult):
    """Test GET /api/search?q=technology&categories=business,science - Should search only in specified categories"""
    try:
        params = {
            "q": "technology", 
            "categories": "business,science"
        }
        response = requests.get(f"{BACKEND_URL}/search", params=params, timeout=45)
        
        if response.status_code != 200:
            test_result.add_result(
                "Search with Categories Filter", False, 
                f"Expected status 200, got {response.status_code}",
                response.text
            )
            return
            
        data = response.json()
        
        # Check categories_searched field
        expected_categories = ["business", "science"]
        categories_searched = data.get("categories_searched", [])
        
        if set(categories_searched) != set(expected_categories):
            test_result.add_result(
                "Search Categories Searched Field", False, 
                f"Expected categories {expected_categories}, got {categories_searched}"
            )
        else:
            test_result.add_result(
                "Search Categories Searched Field", True, 
                "Correctly shows searched categories"
            )
        
        articles = data["articles"]
        
        if len(articles) > 0:
            # Check that articles only come from specified categories
            article_categories = [article["category"] for article in articles]
            invalid_categories = [cat for cat in article_categories if cat not in expected_categories]
            
            if invalid_categories:
                test_result.add_result(
                    "Search Category Filtering", False, 
                    f"Found articles from unexpected categories: {set(invalid_categories)}"
                )
            else:
                test_result.add_result(
                    "Search Category Filtering", True, 
                    f"All {len(articles)} articles are from requested categories only"
                )
            
            # Check if articles contain 'technology'
            tech_articles = []
            for article in articles[:5]:  # Check first 5
                if "technology" in article["title"].lower() or "technology" in article["description"].lower():
                    tech_articles.append(article["title"])
            
            if len(tech_articles) > 0:
                test_result.add_result(
                    "Search Content Match (technology)", True, 
                    f"Found {len(articles)} articles, {len(tech_articles)} contain 'technology'"
                )
            else:
                test_result.add_result(
                    "Search Content Match (technology)", False, 
                    f"Found {len(articles)} articles but none contain 'technology' in title/description"
                )
        else:
            test_result.add_result(
                "Search with Categories Results", False, 
                "No articles found for 'technology' in business/science categories"
            )
        
    except Exception as e:
        test_result.add_result(
            "Search with Categories Filter", False, 
            f"Request failed: {str(e)}"
        )

def main():
    print("🧪 Starting European News RSS API Backend Tests")
    print(f"🔗 Testing backend at: {BACKEND_URL}")
    print("="*60)
    
    test_result = TestResult()
    
    # Run all tests
    print("1. Testing Health Check Endpoint...")
    test_health_endpoint(test_result)
    
    print("2. Testing Categories Endpoint...")
    test_categories_endpoint(test_result)
    
    print("3. Testing Single Category News (Technology)...")
    test_single_category_news(test_result, "technology")
    
    print("4. Testing Single Category News (Politics)...")
    test_single_category_news(test_result, "politics")
    
    print("5. Testing Multiple Categories News...")
    test_multiple_categories_news(test_result)
    
    print("6. Testing Sources Endpoint...")
    test_sources_endpoint(test_result)
    
    print("7. Testing Error Handling...")
    test_invalid_category(test_result)
    
    print("8. Testing Search Endpoint (Basic)...")
    test_search_endpoint_basic(test_result)
    
    print("9. Testing Search Endpoint (With Limit)...")
    test_search_endpoint_with_limit(test_result)
    
    print("10. Testing Search Endpoint (Validation)...")
    test_search_endpoint_validation(test_result)
    
    print("11. Testing Search Endpoint (With Categories)...")
    test_search_endpoint_with_categories(test_result)
    
    # Print summary
    test_result.print_summary()
    
    # Return exit code
    return 0 if test_result.failed == 0 else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)