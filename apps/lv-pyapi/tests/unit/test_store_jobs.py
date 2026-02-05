import pandas as pd
from unittest.mock import Mock, patch, MagicMock
from store_jobs import parse_vector, parse_lists, parse_uuid, parse_timestamp, parse_int, parse_float, parse_bool, save_jobs_to_db
from datetime import datetime
import uuid


class TestParseVector:
    """Test vector parsing from different formats"""
    
    def test_parse_vector_with_square_brackets(self):
        """Test parsing vector with square brackets"""
        result = parse_vector("[0.1, 0.2, 0.3]")
        assert result == [0.1, 0.2, 0.3]
    
    def test_parse_vector_with_negative_values(self):
        """Test parsing vector with negative values"""
        result = parse_vector("[-0.001, 0.002, -0.003]")
        assert result == [-0.001, 0.002, -0.003]
    
    def test_parse_vector_with_nan(self):
        """Test parsing vector with NaN value"""
        result = parse_vector(pd.NA)
        assert result is None


class TestParseLists:
    """Test list parsing from different formats"""
    
    def test_parse_lists_with_comma_separated_string(self):
        """Test parsing comma-separated string"""
        result = parse_lists("Python, JavaScript, SQL")
        assert result == ["Python", "JavaScript", "SQL"]
    
    def test_parse_lists_with_curly_braces(self):
        """Test parsing PostgreSQL array format"""
        result = parse_lists("{Python,JavaScript,SQL}")
        assert result == ["Python", "JavaScript", "SQL"]
    
    def test_parse_lists_with_nan(self):
        """Test parsing list with NaN value"""
        result = parse_lists(pd.NA)
        assert result == []
    
    def test_parse_lists_with_empty_string(self):
        """Test parsing empty string"""
        result = parse_lists("")
        assert result == []


class TestParseUuid:
    """Test UUID parsing"""
    
    def test_parse_uuid_valid_string(self):
        """Test parsing valid UUID string"""
        uuid_str = "123e4567-e89b-12d3-a456-426614174000"
        result = parse_uuid(uuid_str)
        assert isinstance(result, uuid.UUID)
        assert str(result) == uuid_str
    
    def test_parse_uuid_with_nan(self):
        """Test parsing UUID with NaN value"""
        result = parse_uuid(pd.NA)
        assert result is None


class TestParseTimestamp:
    """Test timestamp parsing"""
    
    def test_parse_timestamp_valid_string(self):
        """Test parsing valid ISO timestamp"""
        timestamp_str = "2024-01-01T12:00:00"
        result = parse_timestamp(timestamp_str)
        assert isinstance(result, datetime)
    
    def test_parse_timestamp_with_nan(self):
        """Test parsing timestamp with NaN value"""
        result = parse_timestamp(pd.NA)
        assert result is None


class TestParseInt:
    """Test integer parsing"""
    
    def test_parse_int_valid_string(self):
        """Test parsing valid integer string"""
        result = parse_int("42")
        assert result == 42
    
    def test_parse_int_with_nan(self):
        """Test parsing integer with NaN value"""
        result = parse_int(pd.NA)
        assert result is None
    
    def test_parse_int_invalid_string(self):
        """Test parsing invalid integer string"""
        result = parse_int("not a number")
        assert result is None


class TestParseFloat:
    """Test float parsing"""
    
    def test_parse_float_valid_string(self):
        """Test parsing valid float string"""
        result = parse_float("42.5")
        assert result == 42.5
    
    def test_parse_float_with_nan(self):
        """Test parsing float with NaN value"""
        result = parse_float(pd.NA)
        assert result is None
    
    def test_parse_float_invalid_string(self):
        """Test parsing invalid float string"""
        result = parse_float("not a number")
        assert result is None


class TestParseBool:
    """Test boolean parsing"""
    
    def test_parse_bool_true_string(self):
        """Test parsing true boolean string"""
        assert parse_bool("true") is True
        assert parse_bool("True") is True
        assert parse_bool("1") is True
    
    def test_parse_bool_false_string(self):
        """Test parsing false boolean string"""
        assert parse_bool("false") is False
        assert parse_bool("False") is False
        assert parse_bool("0") is False
    
    def test_parse_bool_with_nan(self):
        """Test parsing boolean with NaN value"""
        result = parse_bool(pd.NA)
        assert result is False


class TestSaveJobsToDb:
    """Test saving jobs to database"""
    
    @patch('store_jobs.SessionLocal')
    def test_save_jobs_to_db_success(self, mock_session_local):
        """Test successfully saving jobs to database"""
        # Create mock database session
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Mock execute result
        mock_result = Mock()
        mock_result.rowcount = 1
        mock_db.execute.return_value = mock_result
        
        # Create test DataFrame
        df = pd.DataFrame({
            'id': ['123e4567-e89b-12d3-a456-426614174000'],
            'job_title': ['Software Engineer'],
            'job_description': ['Great job opportunity'],
            'job_is_active': [True],
            'company_name': ['Tech Corp'],
            'country': ['USA'],
            'source_url': ['https://example.com'],
            'apply_link': ['https://example.com/apply'],
            'source': ['test'],
        })
        
        # Call function
        result = save_jobs_to_db(df)
        
        # Assertions
        assert "Successfully inserted 1 jobs" in result
        mock_db.commit.assert_called_once()
        mock_db.close.assert_called_once()
    
    @patch('store_jobs.SessionLocal')
    def test_save_jobs_to_db_duplicates(self, mock_session_local):
        """Test handling duplicate jobs"""
        # Create mock database session
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Mock execute result with no rows inserted (duplicate)
        mock_result = Mock()
        mock_result.rowcount = 0
        mock_db.execute.return_value = mock_result
        
        # Create test DataFrame
        df = pd.DataFrame({
            'id': ['123e4567-e89b-12d3-a456-426614174000'],
            'job_title': ['Software Engineer'],
            'job_description': ['Great job opportunity'],
            'job_is_active': [True],
            'company_name': ['Tech Corp'],
            'country': ['USA'],
            'source_url': ['https://example.com'],
            'apply_link': ['https://example.com/apply'],
            'source': ['test'],
        })
        
        # Call function
        result = save_jobs_to_db(df)
        
        # Assertions
        assert "only found duplicates" in result
        mock_db.commit.assert_called_once()
        mock_db.close.assert_called_once()
