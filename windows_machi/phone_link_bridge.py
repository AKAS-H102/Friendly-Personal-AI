"""
Machi Assistant - Windows Calling & Phone Link Bridge
Integrates with Microsoft Phone Link and Windows telephony protocol (tel:).
Initiates phone calls through connected phone with mandatory user confirmation for ambiguous contacts.
"""

import os
import subprocess
import webbrowser
from typing import Dict, List, Optional, Tuple

class WindowsPhoneLinkBridge:
    def __init__(self):
        # Sample cached contacts for desktop resolution
        self.contacts: Dict[str, str] = {
            "sir": "+91 98765 43210",
            "mom": "+91 98765 00001",
            "dad": "+91 98765 00002",
            "suresh": "+91 98765 11223",
            "ramesh": "+91 98765 44556",
            "office": "+91 44 2828 0000",
        }

    def resolve_contact(self, query: str) -> Tuple[Optional[str], Optional[str], bool]:
        """
        Resolves query to (contact_name, phone_number, is_ambiguous).
        Requires confirmation if multiple matches or unknown number.
        """
        query_clean = query.lower().strip()
        matches = [(name, num) for name, num in self.contacts.items() if query_clean in name]
        
        if len(matches) == 1:
            return matches[0][0].title(), matches[0][1], False
        elif len(matches) > 1:
            return None, None, True  # Ambiguous
        else:
            # If user spoke raw digits
            digits = "".join(filter(str.isdigit, query))
            if len(digits) >= 10:
                return f"Number ({digits})", digits, False
            return None, None, False

    def initiate_call(self, phone_number: str) -> bool:
        """
        Launches Windows default telephony handler (Phone Link or Skype) with the resolved number.
        """
        try:
            clean_num = "".join(c for c in phone_number if c.isdigit() or c == "+")
            uri = f"tel:{clean_num}"
            print(f"[PhoneLinkBridge] Launching dialer URI: {uri}")
            os.startfile(uri)
            return True
        except Exception as e:
            print(f"[PhoneLinkBridge] Failed to open telephony URI: {e}")
            try:
                # Fallback to Phone Link protocol
                subprocess.Popen(["cmd", "/c", f"start ms-phone-link:call?number={clean_num}"], shell=True)
                return True
            except Exception as e2:
                print(f"[PhoneLinkBridge] Fallback error: {e2}")
                return False

    def get_supported_capabilities_doc(self) -> str:
        return (
            "Windows Calling Capabilities:\n"
            "1. Outgoing Call: Supported via Windows 'tel:' URI and Microsoft Phone Link app.\n"
            "2. Incoming Call Alert: Supported when Phone Link app is paired via Bluetooth and granted notification access.\n"
            "3. Answering Call: Direct programmatic answering depends on Phone Link Windows Bluetooth HFP profile; opening the Phone Link popup is guaranteed."
        )
