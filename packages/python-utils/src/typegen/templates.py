PYDANTIC_MODEL_TEMPLATE = '''
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

{imports}

{models}
'''

PYDANTIC_CLASS_TEMPLATE = '''
class {name}(BaseModel):
    {fields}
    
    class Config:
        from_attributes = True
''' 