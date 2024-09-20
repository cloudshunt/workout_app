#!/bin/bash
dropdb copy-test-db
createdb copy-test-db
psql -d copy-test-db < setup_schema.sql
psql -d copy-test-db < created_schema.sql
psql -d copy-test-db < seed.sql
psql -d copy-test-db < copy.sql

psql -d copy-test-db < tests.sql