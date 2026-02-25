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
BACKEND_URL = "https://euroews-rss.preview.emergentagent.com/api"

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
    
    # Print summary
    test_result.print_summary()
    
    # Return exit code
    return 0 if test_result.failed == 0 else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)