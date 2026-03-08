

## Add Sequential Address Sample Data

Insert 20 locations with sequential addresses (e.g., "1 Main St", "2 Main St", ..., "20 Main St") using the existing `created_by` user ID. No names, default type (residential), default status (not_surveyed).

### Data Insert
Use the data insert tool to run:
```sql
INSERT INTO locations (address, created_by) VALUES
('1 Main St', 'c1287690-505e-4998-96ba-2d938d5e7c8f'),
('2 Main St', 'c1287690-505e-4998-96ba-2d938d5e7c8f'),
...
('20 Main St', 'c1287690-505e-4998-96ba-2d938d5e7c8f');
```

No code or schema changes needed -- just a data insert.

