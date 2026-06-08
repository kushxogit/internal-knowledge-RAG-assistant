from abc import ABC, abstractmethod
from typing import List
from pathlib import Path
from ..schemas import ParsedElement

class BaseParser(ABC):
    """
    Base interface for all document parsers.
    """
    
    @abstractmethod
    def parse(self, file_path: Path) -> List[ParsedElement]:
        """
        Parse a file and extract structural elements.
        
        Args:
            file_path: Path to the file to parse.
            
        Returns:
            A list of ParsedElement objects representing the document's structure.
        """
        pass
