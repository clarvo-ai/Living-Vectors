import hashlib
from typing import Union


def hash_text(text: Union[str, bytes]) -> str:
    """
    Hash the given text using SHA256.
    
    Args:
        text: Text to hash, can be either string or bytes
        
    Returns:
        str: Hexadecimal representation of the SHA256 hash
    """
    if isinstance(text, str):
        text = text.encode('utf-8')
    
    return hashlib.sha256(text).hexdigest() 