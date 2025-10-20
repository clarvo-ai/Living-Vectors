import importlib
import inspect
import os
import warnings
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple, Type, Union
from uuid import UUID

from sqlalchemy import (ARRAY, BigInteger, Boolean, Column, Integer, MetaData, String,
                        Table, Text, UniqueConstraint, ForeignKey, ForeignKeyConstraint)
from sqlalchemy.dialects.postgresql import DOUBLE_PRECISION, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

# Suppress SQLAlchemy warnings about vector type
warnings.filterwarnings('ignore', message='Did not recognize type .vector.')

class Vector(TypeDecorator):
    """Custom type for PostgreSQL vector type"""
    impl = String
    cache_ok = True

    def __init__(self, dimensions=None):
        super().__init__()
        self.dimensions = dimensions

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value

class Base(DeclarativeBase):
    pass

# Type mapping dictionary
type_map: Dict[str, Tuple[Type, Any]] = {
    'TEXT': (str, Text),
    'TIMESTAMP': (datetime, TIMESTAMP),
    'BOOLEAN': (bool, Boolean),
    'INTEGER': (int, Integer),
    'BIGINT': (int, BigInteger),
    'DOUBLE PRECISION': (float, DOUBLE_PRECISION),
    'UUID': (UUID, PostgresUUID(as_uuid=True)),
    'VARCHAR': (str, String),
    'ARRAY': (List[str], ARRAY(Text)),
    'vector': (str, Vector()),
    'NULL': (str, Text),  # Changed from NULL to Text as a fallback
}

def get_python_type(sql_type: str) -> Type:
    """Get the Python type for a given SQL type"""
    return type_map.get(sql_type.upper(), (str, Text))[0]

def get_sql_type(sql_type: str) -> Any:
    """Get the SQLAlchemy type for a given SQL type"""
    return type_map.get(sql_type.upper(), (str, Text))[1]

def generate_sqlalchemy_models():
    """Generate SQLAlchemy models using manual generation"""
    db_url = os.getenv(
        'DATABASE_URL', 
        'postgresql://postgres:postgres@localhost:3762/postgres'
    )
    
    output_file = Path(__file__).parent.parent / "python_utils" / "sqlalchemy_models.py"
    output_file.parent.mkdir(exist_ok=True)
    
    # Generate models directly using manual generation
    generate_models_manually(db_url, output_file)

def get_model_dependencies(table_name: str, relationships: dict) -> set:
    """Get all tables that this table depends on through relationships"""
    deps = set()
    for rel in relationships.get(table_name, []):
        deps.add(rel['target'])
    return deps

def sort_models_by_dependencies(tables: dict, relationships: dict) -> list:
    """Sort tables topologically so that each table comes after its dependencies"""
    sorted_tables = []
    visited = set()
    temp_visited = set()

    def visit(table_name):
        if table_name in temp_visited:
            # Circular dependency detected, break it by treating it as visited
            return
        if table_name in visited:
            return
        
        temp_visited.add(table_name)
        for dep in get_model_dependencies(table_name, relationships):
            visit(dep)
        temp_visited.remove(table_name)
        visited.add(table_name)
        sorted_tables.append(table_name)

    # Visit all tables
    for table_name in tables:
        if table_name not in visited:
            visit(table_name)

    return sorted_tables

def sort_classes_alphabetically(content: str) -> str:
    """Sort SQLAlchemy model classes alphabetically while preserving imports and other content."""
    # Split content into header (imports, etc) and classes
    lines = content.split('\n')
    header_lines = []
    enum_classes = []
    model_classes = []
    base_class = []
    current_class = []
    in_class = False

    for line in lines:
        if line.startswith('class '):
            if current_class:
                class_content = '\n'.join(current_class)
                # Check if it's the Base class
                if 'class Base(DeclarativeBase):' in current_class[0]:
                    base_class = current_class
                # Check if it's an enum class
                elif '(enum.Enum)' in current_class[0]:
                    enum_classes.append(class_content)
                else:
                    model_classes.append(class_content)
                current_class = []
            in_class = True
            current_class = [line]
        elif not line.strip() and not in_class:
            header_lines.append(line)
        elif in_class:
            current_class.append(line)
        else:
            header_lines.append(line)

    # Add the last class if exists
    if current_class:
        class_content = '\n'.join(current_class)
        if 'class Base(DeclarativeBase):' in current_class[0]:
            base_class = current_class
        elif '(enum.Enum)' in current_class[0]:
            enum_classes.append(class_content)
        else:
            model_classes.append(class_content)

    # Sort enum classes and model classes separately
    sorted_enum_classes = sorted(enum_classes, key=lambda x: x.split('class ')[1].split('(')[0].strip())
    sorted_model_classes = sorted(model_classes, key=lambda x: x.split('class ')[1].split('(')[0].strip())

    # Combine everything back together with enums first, then Base class, then model classes
    header = '\n'.join(header_lines)
    if sorted_enum_classes:
        header += '\n# Enum Classes\n'
    sorted_content = header + '\n'.join(sorted_enum_classes)
    
    # Add Base class
    if base_class:
        sorted_content += '\n\n# Base Class\n' + '\n'.join(base_class)
    
    if sorted_model_classes:
        sorted_content += '\n\n# Model Classes\n'
    sorted_content += '\n'.join(sorted_model_classes)
    return sorted_content

def generate_models_manually(db_url, output_file):
    """Manually generate SQLAlchemy models when sqlacodegen fails"""
    import enum

    from sqlalchemy import (ARRAY, BigInteger, Boolean, DateTime, Enum, Float, Integer,
                            String, Text, create_engine, inspect, text)
    from sqlalchemy.dialects.postgresql import (DOUBLE_PRECISION, ENUM,
                                                TIMESTAMP, UUID)
    
    engine = create_engine(db_url)
    metadata = MetaData()
    metadata.reflect(bind=engine, extend_existing=True)
    
    # --- NEW: Extract enum column defaults from the database ---
    enum_column_defaults = {}  # {table.column: default_value}
    try:
        default_query = text('''
            SELECT
                c.table_name,
                c.column_name,
                pg_get_expr(d.adbin, d.adrelid) AS default_expr
            FROM
                information_schema.columns c
            JOIN
                pg_attribute a ON a.attname = c.column_name
                AND a.attrelid = (
                    SELECT ct.oid FROM pg_class ct
                    JOIN pg_namespace n ON n.oid = ct.relnamespace
                    WHERE ct.relname = c.table_name AND n.nspname = c.table_schema
                )
            JOIN
                pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
            WHERE
                c.table_schema = 'public'
                AND pg_get_expr(d.adbin, d.adrelid) IS NOT NULL
        ''')
        with engine.connect() as conn:
            result = conn.execute(default_query)
            for row in result:
                table, column, default_expr = row
                # default_expr is like: 'user'::origin or 'someval'::enumtype
                if default_expr and '::' in default_expr:
                    val = default_expr.split('::')[0].strip("'")
                    enum_column_defaults[f"{table.lower()}.{column.lower()}"] = val
    except Exception as e:
        print(f"Warning: Could not extract enum column defaults: {e}")
    
    # Get PostgreSQL enum types using your improved query
    enums = {}
    enum_columns = {}  # Will store table.column -> enum_name mappings
    
    try:
        # Use your improved SQL query to get enum types
        query = text("""
            SELECT
                n.nspname AS schema_name,
                t.typname AS enum_name,
                array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
            FROM
                pg_type t
            JOIN
                pg_namespace n ON n.oid = t.typnamespace
            JOIN
                pg_enum e ON t.oid = e.enumtypid
            WHERE
                t.typtype = 'e'
                AND n.nspname = 'public' -- Replace 'public' with your schema name if different
            GROUP BY
                n.nspname, t.typname;
        """)
        
        with engine.connect() as conn:
            result = conn.execute(query)
            for row in result:
                schema_name, enum_name, enum_values = row
                enums[enum_name] = enum_values
                
        # Find which columns use these enum types
        # This query gets all columns using enum types
        column_query = text("""
            SELECT 
                c.table_schema,
                c.table_name, 
                c.column_name, 
                c.udt_name
            FROM 
                information_schema.columns c
            JOIN 
                pg_type t ON t.typname = c.udt_name
            WHERE 
                t.typtype = 'e'
                AND c.table_schema = 'public';
        """)
        
        with engine.connect() as conn:
            column_result = conn.execute(column_query)
            for row in column_result:
                schema, table, column, enum_type = row
                enum_columns[f"{table.lower()}.{column.lower()}"] = enum_type
                
    except Exception as e:
        print(f"Warning: Could not extract enum types: {e}")
    
    # Generate the header with all necessary imports
    header = '''from sqlalchemy import String, DateTime, Boolean, Integer, BigInteger, ForeignKey, ForeignKeyConstraint, Table, ARRAY, Text, Float, Enum, text, func, event
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, TIMESTAMP, DOUBLE_PRECISION, ENUM
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column, Mapper
from sqlalchemy.types import TypeDecorator
from uuid import UUID
from typing import Optional, List, Any, Sequence
from datetime import datetime
import enum

class Vector(TypeDecorator):
    """Custom type for PostgreSQL vector type"""
    impl = String
    cache_ok = True

    def __init__(self, dimensions=None):
        super().__init__()
        self.dimensions = dimensions

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value

class Base(DeclarativeBase):
    pass

def trim_strings(mapper: Mapper, connection, target):
    """Trim whitespace from all string attributes before insert/update"""
    for key, value in vars(target).items():
        # Skip SQLAlchemy internal attributes and non-string values
        if not key.startswith('_') and isinstance(value, str):
            setattr(target, key, value.strip())

# Apply string trimming to all models before insert and update
@event.listens_for(Base, "before_insert", propagate=True)
@event.listens_for(Base, "before_update", propagate=True)
def receive_before_insert_update(mapper, connection, target):
    trim_strings(mapper, connection, target)

'''
    
    # Generate enum classes if we found any
    enum_classes = []
    for enum_name, enum_values in enums.items():
        # Fix the indentation of enum values - only 4 spaces instead of 8
        values_str = []
        for val in enum_values:
            # Add type ignore comment for 'value' fields to avoid conflicts with Enum.value
            if val == 'value':
                values_str.append(f"    value = 'value'  # type: ignore")
            else:
                values_str.append(f"    {val} = '{val}'")
        
        enum_class = f'''
class {enum_name}(enum.Enum):
    """Enum type for {enum_name}"""
{chr(10).join(values_str)}
'''
        enum_classes.append(enum_class)
    
    # Add enum classes to header
    if enum_classes:
        header += '\n'.join(enum_classes)
        header += '\n'
    
    models = []
    # First pass: collect all table relationships
    relationships = {}

    def is_join_table(table):
        """Determine if a table is a join table by checking if it has exactly two foreign key columns that are also primary keys"""
        fk_columns = [col for col in table.columns if col.foreign_keys]
        pk_columns = [col for col in table.columns if col.primary_key]
        return len(fk_columns) == 2 and all(col.primary_key for col in fk_columns) and len(pk_columns) == len(fk_columns)

    def get_relationship_names(table1, table2):
        """Get consistent relationship names between two tables"""
        # Keep the original names but ensure first character is lowercase
        name1 = table2[0].lower() + table2[1:]
        name2 = table1[0].lower() + table1[1:]
        return (name1, name2)

    def get_unique_relationships(metadata):
        """Get unique relationships between tables"""
        relationships = {}
        processed_pairs = set()
        join_table_relationships = set()  # Track which relationships are handled by join tables

        # Initialize relationships dict for all tables
        for table_name in metadata.tables:
            clean_table_name = table_name.split('.')[-1]
            if clean_table_name not in relationships:
                relationships[clean_table_name] = []

        # First pass: Handle join tables and record their relationships
        for table_name, table in metadata.tables.items():
            schema, clean_table_name = table_name.split('.') if '.' in table_name else ('public', table_name)
            
            if is_join_table(table):
                fk_columns = [col for col in table.columns if col.foreign_keys]
                table1 = next(iter(fk_columns[0].foreign_keys)).column.table.name.split('.')[-1]
                table2 = next(iter(fk_columns[1].foreign_keys)).column.table.name.split('.')[-1]
                
                # Record that these tables have a join table relationship
                join_table_relationships.add(tuple(sorted([table1, table2])))
                
                # Get relationship names
                rel_name1, back_name1 = get_relationship_names(clean_table_name, table1)
                rel_name2, back_name2 = get_relationship_names(clean_table_name, table2)
                
                # Add relationship from table1 to join table
                relationships[table1].append({
                    'name': clean_table_name[0].lower() + clean_table_name[1:],
                    'target': clean_table_name,
                    'back_populates': rel_name1
                })
                
                # Add relationship from table2 to join table
                relationships[table2].append({
                    'name': clean_table_name[0].lower() + clean_table_name[1:],
                    'target': clean_table_name,
                    'back_populates': rel_name2
                })
                
                # Add relationships from join table to both tables
                relationships[clean_table_name].append({
                    'name': table1[0].lower() + table1[1:],
                    'target': table1,
                    'back_populates': clean_table_name[0].lower() + clean_table_name[1:],
                    'uselist': False
                })
                
                relationships[clean_table_name].append({
                    'name': table2[0].lower() + table2[1:],
                    'target': table2,
                    'back_populates': clean_table_name[0].lower() + clean_table_name[1:],
                    'uselist': False
                })

        # Second pass: Handle regular foreign key relationships
        for table_name, table in metadata.tables.items():
            schema, clean_table_name = table_name.split('.') if '.' in table_name else ('public', table_name)
            
            if is_join_table(table):
                continue
            
            # Get all foreign key columns in this table
            fk_columns = [col for col in table.columns if col.foreign_keys]
            
            # Handle direct foreign key relationships
            for col in fk_columns:
                fk = next(iter(col.foreign_keys))
                target_table_name = fk.column.table.name
                target_table = target_table_name.split('.')[-1]
                
                # Skip if this is part of a join table relationship
                if tuple(sorted([clean_table_name, target_table])) in join_table_relationships:
                    continue
                
                # Get consistent relationship names
                rel_name, back_name = get_relationship_names(clean_table_name, target_table)
                
                # Check if this is a one-to-one relationship
                # A foreign key column is part of a one-to-one relationship if:
                # 1. The column itself has a unique constraint, OR
                # 2. The column is the only column in a unique constraint
                is_one_to_one = (
                    col.unique or  # Direct unique constraint on column
                    any(  # Single-column unique constraint
                        isinstance(constraint, UniqueConstraint) and 
                        len(constraint.columns) == 1 and 
                        col.name == list(constraint.columns)[0].name
                        for constraint in table.constraints
                    ) or
                    any(  # Unique index on just this column
                        idx.unique and 
                        len(idx.columns) == 1 and 
                        col.name == idx.columns[0].name
                        for idx in table.indexes
                    )
                )
                
                # Add relationship from this table to target (many-to-one)
                relationships[clean_table_name].append({
                    'name': rel_name,
                    'target': target_table,
                    'back_populates': back_name,
                    'uselist': False  # The foreign key side is always single (many-to-one)
                })
                
                # Add back-reference from target to this table (one-to-many)
                relationships[target_table].append({
                    'name': back_name,
                    'target': clean_table_name,
                    'back_populates': rel_name,
                    'uselist': not is_one_to_one  # Only one-to-one if the foreign key has a unique constraint
                })
        
        return relationships

    relationships = get_unique_relationships(metadata)

    # Sort tables by dependencies
    sorted_table_names = sort_models_by_dependencies(metadata.tables, relationships)
    
    models = []
    for table_name in sorted_table_names:
        table = metadata.tables[table_name]
        if '.' in table_name:
            schema, clean_table_name = table_name.split('.')
        else:
            schema = 'public'
            clean_table_name = table_name
        
        class_name = clean_table_name

        # --- Non-destructive composite foreign key detection ---
        composite_fks = []
        composite_fk_cols = set()
        for constraint in table.constraints:
            if isinstance(constraint, ForeignKeyConstraint) and len(constraint.elements) > 1:
                local_cols = [el.parent.name for el in constraint.elements]
                remote_cols = [
                    f"{(el.column.table.schema or 'public')}.{el.column.table.name}.{el.column.name}"
                    for el in constraint.elements
                ]
                composite_fks.append((local_cols, remote_cols, getattr(constraint, 'ondelete', None)))
                composite_fk_cols.update(local_cols)
        
        model = f'''
class {class_name}(Base):
    __tablename__ = "{clean_table_name}"
'''
        # Emit __table_args__ with composite FKs if any, else as before
        table_args = []
        for local_cols, remote_cols, ondelete in composite_fks:
            fk_str = f"ForeignKeyConstraint({local_cols}, {remote_cols}, ondelete='{ondelete}')" if ondelete else f"ForeignKeyConstraint({local_cols}, {remote_cols})"
            table_args.append(fk_str)
        table_args.append(f"{{'schema': '{schema}'}}")
        if len(table_args) > 1:
            model += f"    __table_args__ = (\n"
            for arg in table_args:
                model += f"        {arg},\n"
            model += f"    )\n\n"
        else:
            model += f"    __table_args__ = {{'schema': '{schema}'}}\n\n"

        is_session_table = clean_table_name == "Session"
        
        # Generate columns
        for column in table.columns:
            col_type = str(column.type)
            col_name = column.name
            
            # Check if column name is 'metadata' - a reserved attribute in SQLAlchemy - rename to 'metadata1'
            if col_name == 'metadata':
                # For metadata, explicitly specify the column name while using metadata1 as attribute
                model += f'    metadata1: Mapped[str] = mapped_column("metadata", Text, nullable={str(column.nullable)})\n'
                continue
            
            # Check if this column uses an enum type
            enum_key = f"{clean_table_name.lower()}.{column.name.lower()}"
            enum_type_name = enum_columns.get(enum_key)
            
            if enum_type_name and enum_type_name in enums:
                python_type = enum_type_name
                sql_type = f'Enum({enum_type_name})'
            # Handle array types
            elif col_type.startswith('ARRAY'):
                python_type = 'List[str]'
                sql_type = 'ARRAY(Text)'
            # Handle vector type
            elif 'vector' in col_type.lower():
                python_type = 'str'
                sql_type = 'Vector()'
            # Handle UUID type
            elif 'UUID' in col_type:
                python_type = 'UUID'
                sql_type = 'PostgresUUID(as_uuid=True)'
            # Handle timestamp type
            elif col_type == 'TIMESTAMP':
                python_type = 'datetime'
                sql_type = 'TIMESTAMP'
            # Handle boolean type
            elif col_type == 'BOOLEAN':
                python_type = 'bool'
                sql_type = 'Boolean'
            # Handle integer type
            elif col_type == 'INTEGER':
                python_type = 'int'
                sql_type = 'Integer'
            # Handle bigint type
            elif col_type == 'BIGINT':
                python_type = 'int'
                sql_type = 'BigInteger'
            # Handle double precision type
            elif col_type == 'DOUBLE PRECISION':
                python_type = 'float'
                sql_type = 'DOUBLE_PRECISION'
            # Handle other types
            else:
                python_type = 'str'
                sql_type = 'Text'
            
            # Add Optional[] if nullable
            if column.nullable:
                python_type = f'Optional[{python_type}]'
            
            # --- NEW: Add enum default if present from DB ---
            default_str = ''
            if enum_type_name and enum_type_name in enums:
                db_default_val = enum_column_defaults.get(enum_key)
                if db_default_val:
                    default_str = f', default={enum_type_name}.{db_default_val}'
            
            # Only skip ForeignKey for columns that are part of a composite FK, otherwise keep all existing logic
            if col_name in composite_fk_cols:
                fk_def = ''
            else:
                if column.foreign_keys:
                    fk = next(iter(column.foreign_keys))
                    target_table = fk.column.table.name
                    if '.' in target_table:
                        _, target_table = target_table.split('.')
                    fk_def = f', ForeignKey("{schema}.{target_table}.{fk.column.name}")'
                else:
                    fk_def = ''
            
            nullable = ', nullable=True' if column.nullable else ', nullable=False'
            
            # If this is the Session table's sessionToken column, make it primary key
            # based on the Prisma schema
            if is_session_table and col_name == 'sessionToken':
                primary_key = ', primary_key=True'
            else:
                primary_key = ', primary_key=True' if column.primary_key else ''
                
            unique = ', unique=True' if column.unique else ''
            
            # Add unique constraint to sessionToken for Session table if it's not already set
            if is_session_table and col_name == 'sessionToken' and not column.unique:
                unique = ', unique=True'
            
            # Add server_default for UUID primary keys
            server_default = ''
            if primary_key and 'UUID' in sql_type:
                server_default = ', server_default=text("gen_random_uuid()")'
            elif col_name in ['created_at', 'createdAt']:
                server_default = ', server_default=func.now()'
            elif col_name in ['updated_at', 'updatedAt']:
                server_default = ', server_default=func.now(), onupdate=func.now()'
                
            model += f'    {col_name}: Mapped[{python_type}] = mapped_column({sql_type}{fk_def}{primary_key}{nullable}{unique}{server_default}{default_str})\n'
        
        # Add relationships
        if relationships[clean_table_name]:
            model += '\n    # Relationships\n'
            seen_relationships = set()
            for rel in relationships[clean_table_name]:
                # Skip if we've already seen this relationship name
                if rel['name'] in seen_relationships:
                    continue
                seen_relationships.add(rel['name'])
                
                rel_def = f'relationship("{rel["target"]}", back_populates="{rel["back_populates"]}"'
                
                # Add uselist=False for one-to-one relationships
                is_single = 'uselist' in rel and not rel['uselist']
                if is_single:
                    rel_def += ', uselist=False'
                
                # Use the same logic for Python type as we do for uselist
                python_type = f'"{rel["target"]}"' if is_single else f'List["{rel["target"]}"]'
                
                model += f'    {rel["name"]}: Mapped[{python_type}] = {rel_def})\n'
        
        models.append(model)
    
    # Write the file
    content = header + '\n'.join(models)
    
    # Sort the classes alphabetically
    sorted_content = sort_classes_alphabetically(content)
    
    # Write the sorted content to file
    with open(output_file, 'w') as f:
        f.write(sorted_content)

def generate_pydantic_models():
    """Generate Pydantic models from SQLAlchemy models"""
    # Rest of the function remains the same...
    pass

def main():
    """Main function to generate both SQLAlchemy and Pydantic models"""
    generate_sqlalchemy_models()
    generate_pydantic_models()

if __name__ == '__main__':
    main()
