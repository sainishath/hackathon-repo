.PHONY: setup ingest test run run-web eval clean

PYTHON ?= python

setup:
	$(PYTHON) -m pip install -r requirements.txt

ingest:
	$(PYTHON) -m procurement.ingest.build_index

test:
	$(PYTHON) -m pytest tests -v

run:
	$(PYTHON) -m streamlit run app/streamlit_app.py

run-web:
	uvicorn procurement.api:app --host 127.0.0.1 --port 8000 --reload

eval:
	$(PYTHON) -m procurement.retrieval.evaluate

clean:
	rm -rf data/processed/*.npz data/processed/*.pkl __pycache__ .pytest_cache
