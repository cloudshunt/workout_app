#!/bin/bash
dropdb workout-app
createdb workout-app
psql -d workout-app < ./lib/schema.sql
psql -d workout-app < ./lib/seed.sql
