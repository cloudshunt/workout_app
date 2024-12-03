#!/bin/bash
dropdb workout-app-db
createdb workout-app-db
psql -d workout-app-db < setup_schema.sql
psql -d workout-app-db < track_schema.sql
psql -d workout-app-db < users.sql
psql -d workout-app-db < seed.sql
# psql -d workout-app-db < copy.sql

# psql -d workout-app-db < tests.sql