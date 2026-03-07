"""
Backend API tests for Verityn News App
Tests the /api/news and /api/health endpoints
"""
import pytest
import requests
import os

# Get the backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://news-feed-eu.preview.emergentagent.com')

class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
        print(f"Health check passed: {data}")


class TestNewsEndpoint:
    """News API endpoint tests"""
    
    def test_news_single_category(self):
        """Test /api/news with single category"""
        response = requests.get(f"{BASE_URL}/api/news?categories=politics&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "articles" in data
        assert "total" in data
        assert "categories" in data
        assert "has_more" in data
        
        # Verify we got articles
        articles = data["articles"]
        assert len(articles) > 0
        print(f"Got {len(articles)} articles for politics category")
        
        # Verify article structure
        if articles:
            article = articles[0]
            assert "id" in article
            assert "title" in article
            assert "description" in article
            assert "link" in article
            assert "source" in article
            assert "category" in article
    
    def test_news_multiple_categories(self):
        """Test /api/news with multiple categories"""
        response = requests.get(f"{BASE_URL}/api/news?categories=politics,business,technology&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert "articles" in data
        assert len(data["articles"]) > 0
        assert "politics" in data["categories"] or "business" in data["categories"] or "technology" in data["categories"]
        print(f"Got {len(data['articles'])} articles for multiple categories")
    
    def test_news_pagination_offset(self):
        """Test /api/news pagination with offset parameter"""
        # First request without offset
        response1 = requests.get(f"{BASE_URL}/api/news?categories=politics&limit=5&offset=0")
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second request with offset
        response2 = requests.get(f"{BASE_URL}/api/news?categories=politics&limit=5&offset=5")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify pagination works - articles should be different
        if len(data1["articles"]) > 0 and len(data2["articles"]) > 0:
            ids1 = set(a["id"] for a in data1["articles"])
            ids2 = set(a["id"] for a in data2["articles"])
            # At least some articles should be different
            assert ids1 != ids2, "Pagination should return different articles"
        print("Pagination with offset working correctly")
    
    def test_news_has_more_flag(self):
        """Test that has_more flag indicates more articles available"""
        response = requests.get(f"{BASE_URL}/api/news?categories=politics,business&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # has_more should be true if total > limit
        assert "has_more" in data
        assert "total" in data
        if data["total"] > 5:
            assert data["has_more"] == True
        print(f"has_more flag: {data['has_more']}, total: {data['total']}")
    
    def test_news_invalid_category(self):
        """Test /api/news with invalid category returns 400"""
        response = requests.get(f"{BASE_URL}/api/news?categories=invalid_category&limit=5")
        # Should return 400 for invalid category
        assert response.status_code == 400
        print("Invalid category correctly returns 400 error")
    
    def test_news_article_has_required_fields(self):
        """Test that news articles have all required fields"""
        response = requests.get(f"{BASE_URL}/api/news?categories=technology&limit=3")
        assert response.status_code == 200
        data = response.json()
        
        for article in data["articles"]:
            # Required fields
            assert "id" in article and isinstance(article["id"], str)
            assert "title" in article and isinstance(article["title"], str)
            assert "description" in article and isinstance(article["description"], str)
            assert "link" in article and isinstance(article["link"], str)
            assert "published" in article
            assert "source" in article and isinstance(article["source"], str)
            assert "category" in article and isinstance(article["category"], str)
            # image_url is optional but should be string if present
            if "image_url" in article and article["image_url"]:
                assert isinstance(article["image_url"], str)
        print(f"All {len(data['articles'])} articles have required fields")


class TestCategoriesEndpoint:
    """Categories endpoint tests"""
    
    def test_get_categories(self):
        """Test /api/categories returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data
        categories = data["categories"]
        assert len(categories) > 0
        
        # Verify category structure
        for cat in categories:
            assert "id" in cat
            assert "name" in cat
            assert "icon" in cat
            assert "color" in cat
        
        # Verify expected categories exist
        cat_ids = [c["id"] for c in categories]
        expected_cats = ["politics", "business", "technology", "sports", "entertainment", "health", "science"]
        for expected in expected_cats:
            assert expected in cat_ids, f"Expected category {expected} not found"
        print(f"Found {len(categories)} categories: {cat_ids}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
