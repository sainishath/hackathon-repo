import re
import json
from typing import Optional, Any
from pydantic import BaseModel, Field

from procurement.models import CaseInput
from procurement.generation.llm import get_llm_client, MockLLMClient


class ExtractedFields(BaseModel):
    category: Optional[str] = Field(default="goods", description="goods, services, works, or consultancy")
    estimated_value_inr: Optional[float] = Field(default=None, description="Numeric INR value or null")
    item_description: Optional[str] = Field(default=None, description="Short summary of items/services requested")
    department: Optional[str] = Field(default=None, description="Requesting department or laboratory")
    funding_source: Optional[str] = Field(default=None, description="Budget head or project grant source")
    is_emergency: Optional[bool] = Field(default=False, description="Whether purchase is urgent/emergency")
    is_sole_source: Optional[bool] = Field(default=False, description="Whether proprietary or single vendor")
    quotations_received: Optional[int] = Field(default=None, description="Number of quotations on hand")


def parse_inr_text(text: str) -> Optional[float]:
    """Deterministically extracts Indian Rupee amounts from text."""
    text_lower = text.lower()

    # 1. Crore pattern: e.g. 1.5 crore, 2 cr, rs 1.5 crore
    m_cr = re.search(r'(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:crores?|cr)\b', text_lower)
    if m_cr:
        return float(m_cr.group(1)) * 10000000.0

    # 2. Lakh pattern: e.g. 4.8 lakhs, 1.5 lakh, 50 lakh, 4.8l, 25l
    m_lakh = re.search(r'(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lakh|l)\b', text_lower)
    if m_lakh:
        return float(m_lakh.group(1)) * 100000.0

    # 3. K pattern: e.g. 50k, 40 k
    m_k = re.search(r'(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*k\b', text_lower)
    if m_k:
        return float(m_k.group(1)) * 1000.0

    # 4. Standard currency numbers: ₹ 50,000, Rs. 50000.00, INR 15000
    m_curr = re.search(r'(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)', text_lower)
    if m_curr:
        clean = m_curr.group(1).replace(',', '')
        try:
            return float(clean)
        except ValueError:
            pass

    # 5. Raw number followed by rupees / inr / rs
    m_num = re.search(r'([\d,]+(?:\.\d+)?)\s*(?:rupees|inr|rs)\b', text_lower)
    if m_num:
        clean = m_num.group(1).replace(',', '')
        try:
            return float(clean)
        except ValueError:
            pass

    # 6. Fallback standalone 4+ digit number if words like "for 50000" or "value 50000"
    m_val = re.search(r'(?:worth|cost|value|price|for|budget of)\s+([\d,]+(?:\.\d+)?)', text_lower)
    if m_val:
        clean = m_val.group(1).replace(',', '')
        try:
            val = float(clean)
            if val >= 100:  # Avoid matching "for 3 laptops"
                return val
        except ValueError:
            pass

    return None


def extract_regex_fallback(text: str) -> CaseInput:
    """Rule-based and regex extraction fallback for zero-downtime operation."""
    text_lower = text.lower()

    # Amount
    amount = parse_inr_text(text)

    # Emergency flag
    is_emergency = bool(
        re.search(r'\b(urgent|urgently|emergency|breakdown|critical repair|immediately|asap)\b', text_lower)
    )

    # Sole source flag
    is_sole_source = bool(
        re.search(r'\b(single vendor|single supplier|sole source|proprietary|single brand|pac|pac certificate|single manufacturer|oem only)\b', text_lower)
    )

    # Category
    category = "goods"
    if re.search(r'\b(consultancy|consultant|specialized advisory|advisory services)\b', text_lower):
        category = "Consultancy"
    elif re.search(r'\b(civil repair|civil works|construction|renovation|fabrication|painting)\b', text_lower):
        category = "works"
    elif re.search(r'\b(annual maintenance|amc|housekeeping|outsourced service|courier service|catering)\b', text_lower):
        category = "services"

    # Quotations received
    quotes = None
    m_quotes = re.search(r'(\d+)\s*(?:quotations?|quotes?)', text_lower)
    if m_quotes:
        quotes = int(m_quotes.group(1))
    elif is_sole_source or re.search(r'\b(from single vendor|single quote|1 quote)\b', text_lower):
        quotes = 1

    # Department
    dept = None
    dept_patterns = [
        r'\b(?:in|for|from)\s+(?:the\s+)?([A-Za-z\s]+?(?:engineering|department|dept|lab|laboratory|center))\b',
        r'\b([A-Za-z\s]+?(?:engineering|department|dept|lab|laboratory))\b',
    ]
    for dp in dept_patterns:
        m_dept = re.search(dp, text, re.IGNORECASE)
        if m_dept:
            candidate = m_dept.group(1).strip()
            if len(candidate) > 2 and len(candidate) < 40:
                dept = candidate.title()
                break

    # Funding source
    funding = None
    m_fund = re.search(r'\b(?:from|under|using)\s+([A-Za-z0-9\s]+?(?:grant|budget|fund|project))\b', text, re.IGNORECASE)
    if m_fund:
        funding = m_fund.group(1).strip().title()

    # Description
    desc = text.strip()
    if len(desc) > 120:
        desc = desc[:117] + "..."

    return CaseInput(
        item_description=desc,
        category=category,
        estimated_value_inr=amount,
        funding_source=funding,
        is_emergency=is_emergency,
        is_sole_source=is_sole_source,
        quotations_received=quotes,
        department=dept,
    )


def extract_requisition_input(text: str) -> CaseInput:
    """Extract structured CaseInput parameters from natural language freeform text."""
    if not text or not text.strip():
        return CaseInput(category="goods")

    # Deterministic base extraction
    deterministic_case = extract_regex_fallback(text)

    # Attempt LLM extraction if non-mock client is configured
    client = get_llm_client()
    if not isinstance(client, MockLLMClient):
        extraction_prompt = f"""You are an Institutional Procurement Intake Analyzer.
Extract structured procurement parameters from this purchase requisition.

RULES:
- category: "goods" (default for physical items/equipment), "services", "works", or "Consultancy"
- estimated_value_inr: Exact numeric float in INR. E.g. "4.8 lakhs" -> 480000.0, "50k" -> 50000.0. If NO amount is mentioned in the text, you MUST output null.
- item_description: Brief description of items requested.
- department: Department or lab name if specified, otherwise null.
- funding_source: Grant or budget source if specified, otherwise null.
- is_emergency: true if urgent, emergency, breakdown, otherwise false.
- is_sole_source: true if single vendor, proprietary, PAC, otherwise false.
- quotations_received: integer count of quotes mentioned, or null.

REQUISITION TEXT:
"{text}"
"""
        try:
            llm_result = client.generate_json(extraction_prompt, ExtractedFields)
            if isinstance(llm_result, dict):
                # Enforce regex-validated amount if regex found an explicit currency amount
                llm_val = llm_result.get("estimated_value_inr")
                final_val = deterministic_case.estimated_value_inr if deterministic_case.estimated_value_inr is not None else llm_val

                return CaseInput(
                    category=llm_result.get("category") or deterministic_case.category,
                    estimated_value_inr=final_val,
                    item_description=llm_result.get("item_description") or deterministic_case.item_description,
                    department=llm_result.get("department") or deterministic_case.department,
                    funding_source=llm_result.get("funding_source") or deterministic_case.funding_source,
                    is_emergency=llm_result.get("is_emergency", deterministic_case.is_emergency),
                    is_sole_source=llm_result.get("is_sole_source", deterministic_case.is_sole_source),
                    quotations_received=llm_result.get("quotations_received", deterministic_case.quotations_received),
                )
        except Exception as e:
            pass

    return deterministic_case
