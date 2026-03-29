-- ================================================================
-- SEED DATA — Run this AFTER migration.sql
-- Inserts 20 sample drivers
-- ================================================================

insert into public.drivers (name, mobile, car_number, car_type) values
  ('Ramesh Kumar',   '9876543210', 'KA01AB1234', 'Sedan'),
  ('Suresh Patel',   '9876543211', 'KA02CD5678', 'SUV'),
  ('Vijay Singh',    '9876543212', 'KA03EF9012', 'Hatchback'),
  ('Anil Sharma',    '9876543213', 'MH04GH3456', 'Sedan'),
  ('Deepak Verma',   '9876543214', 'MH05IJ7890', 'SUV'),
  ('Manoj Gupta',    '9876543215', 'DL06KL1234', 'Hatchback'),
  ('Pradeep Yadav',  '9876543216', 'DL07MN5678', 'Sedan'),
  ('Sanjay Tiwari',  '9876543217', 'UP08OP9012', 'SUV'),
  ('Ashok Nair',     '9876543218', 'TN09QR3456', 'Hatchback'),
  ('Ravi Pillai',    '9876543219', 'TN10ST7890', 'Sedan'),
  ('Mohan Das',      '9876543220', 'KL11UV1234', 'SUV'),
  ('Biju Thomas',    '9876543221', 'KL12WX5678', 'Hatchback'),
  ('Kiran Reddy',    '9876543222', 'AP13YZ9012', 'Sedan'),
  ('Srinivas Rao',   '9876543223', 'AP14AB3456', 'SUV'),
  ('Ganesh Iyer',    '9876543224', 'GJ15CD7890', 'Hatchback'),
  ('Harish Mehta',   '9876543225', 'GJ16EF1234', 'Sedan'),
  ('Naresh Joshi',   '9876543226', 'RJ17GH5678', 'SUV'),
  ('Dinesh Rawat',   '9876543227', 'RJ18IJ9012', 'Hatchback'),
  ('Mahesh Pandey',  '9876543228', 'MP19KL3456', 'Sedan'),
  ('Rakesh Dubey',   '9876543229', 'MP20MN7890', 'SUV');
