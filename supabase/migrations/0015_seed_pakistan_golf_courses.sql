-- Migration 0015: Seed Pakistan Golf Courses
-- Inserts verified course and hole data for major Pakistan golf courses.
-- All data sourced from official scorecards (GolfPass, 18Birdies, Hole19, Stimp).

-- ============================================================
-- 1. Lahore Gymkhana Golf Club
-- ============================================================
INSERT INTO public.courses (id, name, location, description, holes_count, course_rating, slope_rating)
VALUES (
  'a1b2c3d4-1111-4000-8000-000000000001',
  'Lahore Gymkhana Golf Club',
  'Lahore, Punjab',
  'Historic 18-hole parkland course at Lahore Gymkhana Club. Established over a century ago, this par-72 layout stretches 6,043 yards from the championship tees.',
  18, NULL, 106.0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_holes (course_id, hole_number, par, handicap_index, yardage) VALUES
  ('a1b2c3d4-1111-4000-8000-000000000001', 1,  4, 2,  374),
  ('a1b2c3d4-1111-4000-8000-000000000001', 2,  4, 14, 364),
  ('a1b2c3d4-1111-4000-8000-000000000001', 3,  4, 4,  390),
  ('a1b2c3d4-1111-4000-8000-000000000001', 4,  3, 8,  202),
  ('a1b2c3d4-1111-4000-8000-000000000001', 5,  3, 18, 142),
  ('a1b2c3d4-1111-4000-8000-000000000001', 6,  4, 12, 199),
  ('a1b2c3d4-1111-4000-8000-000000000001', 7,  5, 16, 496),
  ('a1b2c3d4-1111-4000-8000-000000000001', 8,  5, 6,  508),
  ('a1b2c3d4-1111-4000-8000-000000000001', 9,  3, 10, 159),
  ('a1b2c3d4-1111-4000-8000-000000000001', 10, 4, 11, 265),
  ('a1b2c3d4-1111-4000-8000-000000000001', 11, 5, 13, 468),
  ('a1b2c3d4-1111-4000-8000-000000000001', 12, 3, 9,  165),
  ('a1b2c3d4-1111-4000-8000-000000000001', 13, 4, 3,  433),
  ('a1b2c3d4-1111-4000-8000-000000000001', 14, 4, 1,  419),
  ('a1b2c3d4-1111-4000-8000-000000000001', 15, 5, 7,  494),
  ('a1b2c3d4-1111-4000-8000-000000000001', 16, 5, 15, 452),
  ('a1b2c3d4-1111-4000-8000-000000000001', 17, 3, 17, 131),
  ('a1b2c3d4-1111-4000-8000-000000000001', 18, 4, 5,  382)
ON CONFLICT (course_id, hole_number) DO NOTHING;

-- ============================================================
-- 2. Royal Palm Golf & Country Club
-- ============================================================
INSERT INTO public.courses (id, name, location, description, holes_count, course_rating, slope_rating)
VALUES (
  'a1b2c3d4-1111-4000-8000-000000000002',
  'Royal Palm Golf & Country Club',
  'Lahore, Punjab',
  'Championship 18-hole course designed by LDR Consultants of Malaysia. Opened in 2002, this par-72 layout features water hazards and dramatic elevation changes across 6,229 yards.',
  18, NULL, NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_holes (course_id, hole_number, par, handicap_index, yardage) VALUES
  ('a1b2c3d4-1111-4000-8000-000000000002', 1,  4, 7,  320),
  ('a1b2c3d4-1111-4000-8000-000000000002', 2,  3, 13, 187),
  ('a1b2c3d4-1111-4000-8000-000000000002', 3,  5, 15, 473),
  ('a1b2c3d4-1111-4000-8000-000000000002', 4,  3, 17, 137),
  ('a1b2c3d4-1111-4000-8000-000000000002', 5,  4, 9,  327),
  ('a1b2c3d4-1111-4000-8000-000000000002', 6,  4, 1,  371),
  ('a1b2c3d4-1111-4000-8000-000000000002', 7,  5, 3,  558),
  ('a1b2c3d4-1111-4000-8000-000000000002', 8,  4, 11, 362),
  ('a1b2c3d4-1111-4000-8000-000000000002', 9,  4, 5,  371),
  ('a1b2c3d4-1111-4000-8000-000000000002', 10, 4, 6,  338),
  ('a1b2c3d4-1111-4000-8000-000000000002', 11, 5, 14, 476),
  ('a1b2c3d4-1111-4000-8000-000000000002', 12, 3, 18, 162),
  ('a1b2c3d4-1111-4000-8000-000000000002', 13, 4, 2,  421),
  ('a1b2c3d4-1111-4000-8000-000000000002', 14, 4, 8,  328),
  ('a1b2c3d4-1111-4000-8000-000000000002', 15, 5, 12, 487),
  ('a1b2c3d4-1111-4000-8000-000000000002', 16, 3, 16, 189),
  ('a1b2c3d4-1111-4000-8000-000000000002', 17, 4, 4,  371),
  ('a1b2c3d4-1111-4000-8000-000000000002', 18, 4, 10, 359)
ON CONFLICT (course_id, hole_number) DO NOTHING;

-- ============================================================
-- 3. PAF Skyview Golf & Country Club
-- ============================================================
INSERT INTO public.courses (id, name, location, description, holes_count, course_rating, slope_rating)
VALUES (
  'a1b2c3d4-1111-4000-8000-000000000003',
  'PAF Skyview Golf & Country Club',
  'Lahore, Punjab',
  'Modern 18-hole championship course opened in 2018. Stretches 6,773 yards from the blue tees with a par-72 layout featuring strategic bunkering and water features.',
  18, 73.1, 123.0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_holes (course_id, hole_number, par, handicap_index, yardage) VALUES
  ('a1b2c3d4-1111-4000-8000-000000000003', 1,  4, 3,  426),
  ('a1b2c3d4-1111-4000-8000-000000000003', 2,  5, 5,  501),
  ('a1b2c3d4-1111-4000-8000-000000000003', 3,  3, 15, 179),
  ('a1b2c3d4-1111-4000-8000-000000000003', 4,  4, 11, 412),
  ('a1b2c3d4-1111-4000-8000-000000000003', 5,  4, 9,  353),
  ('a1b2c3d4-1111-4000-8000-000000000003', 6,  3, 17, 173),
  ('a1b2c3d4-1111-4000-8000-000000000003', 7,  4, 1,  451),
  ('a1b2c3d4-1111-4000-8000-000000000003', 8,  5, 13, 524),
  ('a1b2c3d4-1111-4000-8000-000000000003', 9,  4, 7,  439),
  ('a1b2c3d4-1111-4000-8000-000000000003', 10, 4, 14, 360),
  ('a1b2c3d4-1111-4000-8000-000000000003', 11, 5, 12, 511),
  ('a1b2c3d4-1111-4000-8000-000000000003', 12, 3, 10, 215),
  ('a1b2c3d4-1111-4000-8000-000000000003', 13, 5, 2,  545),
  ('a1b2c3d4-1111-4000-8000-000000000003', 14, 4, 8,  402),
  ('a1b2c3d4-1111-4000-8000-000000000003', 15, 3, 6,  210),
  ('a1b2c3d4-1111-4000-8000-000000000003', 16, 4, 4,  401),
  ('a1b2c3d4-1111-4000-8000-000000000003', 17, 4, 18, 310),
  ('a1b2c3d4-1111-4000-8000-000000000003', 18, 4, 16, 361)
ON CONFLICT (course_id, hole_number) DO NOTHING;

-- ============================================================
-- 4. Margalla Greens Golf Club
-- ============================================================
INSERT INTO public.courses (id, name, location, description, holes_count, course_rating, slope_rating)
VALUES (
  'a1b2c3d4-1111-4000-8000-000000000004',
  'Margalla Greens Golf Club',
  'Islamabad',
  '18-hole semi-private course in Sector E-8, Naval Complex. A par-71 layout stretching 6,267 yards from the blue tees with scenic Margalla Hills backdrop.',
  18, NULL, NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_holes (course_id, hole_number, par, handicap_index, yardage) VALUES
  ('a1b2c3d4-1111-4000-8000-000000000004', 1,  4, 7,  372),
  ('a1b2c3d4-1111-4000-8000-000000000004', 2,  3, 17, 122),
  ('a1b2c3d4-1111-4000-8000-000000000004', 3,  5, 15, 528),
  ('a1b2c3d4-1111-4000-8000-000000000004', 4,  3, 13, 165),
  ('a1b2c3d4-1111-4000-8000-000000000004', 5,  4, 3,  440),
  ('a1b2c3d4-1111-4000-8000-000000000004', 6,  4, 5,  383),
  ('a1b2c3d4-1111-4000-8000-000000000004', 7,  5, 11, 517),
  ('a1b2c3d4-1111-4000-8000-000000000004', 8,  4, 1,  427),
  ('a1b2c3d4-1111-4000-8000-000000000004', 9,  4, 9,  342),
  ('a1b2c3d4-1111-4000-8000-000000000004', 10, 3, 8,  180),
  ('a1b2c3d4-1111-4000-8000-000000000004', 11, 4, 14, 327),
  ('a1b2c3d4-1111-4000-8000-000000000004', 12, 4, 10, 290),
  ('a1b2c3d4-1111-4000-8000-000000000004', 13, 3, 2,  172),
  ('a1b2c3d4-1111-4000-8000-000000000004', 14, 4, 16, 372),
  ('a1b2c3d4-1111-4000-8000-000000000004', 15, 4, 18, 370),
  ('a1b2c3d4-1111-4000-8000-000000000004', 16, 4, 12, 365),
  ('a1b2c3d4-1111-4000-8000-000000000004', 17, 4, 4,  415),
  ('a1b2c3d4-1111-4000-8000-000000000004', 18, 5, 6,  480)
ON CONFLICT (course_id, hole_number) DO NOTHING;

-- ============================================================
-- 5. Airmen Golf Course & Recreational Park
-- ============================================================
INSERT INTO public.courses (id, name, location, description, holes_count, course_rating, slope_rating)
VALUES (
  'a1b2c3d4-1111-4000-8000-000000000005',
  'Airmen Golf Course & Recreational Park',
  'Karachi, Sindh',
  'Championship 18-hole course at PAF Base, Korangi Creek. Opened in 2010, this par-72 layout measures 6,988 metres from the white tees. Host of the Pakistan Open.',
  18, 72.5, 113.0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_holes (course_id, hole_number, par, handicap_index, yardage) VALUES
  ('a1b2c3d4-1111-4000-8000-000000000005', 1,  4, 16, 368),
  ('a1b2c3d4-1111-4000-8000-000000000005', 2,  3, 18, 208),
  ('a1b2c3d4-1111-4000-8000-000000000005', 3,  5, 6,  593),
  ('a1b2c3d4-1111-4000-8000-000000000005', 4,  4, 12, 449),
  ('a1b2c3d4-1111-4000-8000-000000000005', 5,  4, 10, 404),
  ('a1b2c3d4-1111-4000-8000-000000000005', 6,  3, 8,  182),
  ('a1b2c3d4-1111-4000-8000-000000000005', 7,  4, 2,  454),
  ('a1b2c3d4-1111-4000-8000-000000000005', 8,  4, 14, 443),
  ('a1b2c3d4-1111-4000-8000-000000000005', 9,  5, 4,  615),
  ('a1b2c3d4-1111-4000-8000-000000000005', 10, 4, 15, 427),
  ('a1b2c3d4-1111-4000-8000-000000000005', 11, 4, 13, 444),
  ('a1b2c3d4-1111-4000-8000-000000000005', 12, 4, 1,  456),
  ('a1b2c3d4-1111-4000-8000-000000000005', 13, 3, 5,  202),
  ('a1b2c3d4-1111-4000-8000-000000000005', 14, 5, 3,  640),
  ('a1b2c3d4-1111-4000-8000-000000000005', 15, 3, 17, 213),
  ('a1b2c3d4-1111-4000-8000-000000000005', 16, 4, 11, 449),
  ('a1b2c3d4-1111-4000-8000-000000000005', 17, 4, 9,  454),
  ('a1b2c3d4-1111-4000-8000-000000000005', 18, 5, 7,  643)
ON CONFLICT (course_id, hole_number) DO NOTHING;

-- ============================================================
-- 6. Arabian Sea Country Club
-- ============================================================
INSERT INTO public.courses (id, name, location, description, holes_count, course_rating, slope_rating)
VALUES (
  'a1b2c3d4-1111-4000-8000-000000000006',
  'Arabian Sea Country Club',
  'Bin Qasim, Karachi, Sindh',
  'Links-style 18-hole resort course near the Arabian Sea coast. Par-72 layout stretching 7,652 yards from the championship tees with dramatic ocean views.',
  18, NULL, NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_holes (course_id, hole_number, par, handicap_index, yardage) VALUES
  ('a1b2c3d4-1111-4000-8000-000000000006', 1,  4, 11, 425),
  ('a1b2c3d4-1111-4000-8000-000000000006', 2,  3, 17, 202),
  ('a1b2c3d4-1111-4000-8000-000000000006', 3,  4, 1,  459),
  ('a1b2c3d4-1111-4000-8000-000000000006', 4,  5, 15, 559),
  ('a1b2c3d4-1111-4000-8000-000000000006', 5,  3, 13, 212),
  ('a1b2c3d4-1111-4000-8000-000000000006', 6,  4, 5,  459),
  ('a1b2c3d4-1111-4000-8000-000000000006', 7,  5, 7,  591),
  ('a1b2c3d4-1111-4000-8000-000000000006', 8,  4, 3,  471),
  ('a1b2c3d4-1111-4000-8000-000000000006', 9,  4, 9,  448),
  ('a1b2c3d4-1111-4000-8000-000000000006', 10, 4, 16, 414),
  ('a1b2c3d4-1111-4000-8000-000000000006', 11, 5, 8,  580),
  ('a1b2c3d4-1111-4000-8000-000000000006', 12, 4, 4,  470),
  ('a1b2c3d4-1111-4000-8000-000000000006', 13, 3, 14, 211),
  ('a1b2c3d4-1111-4000-8000-000000000006', 14, 5, 6,  600),
  ('a1b2c3d4-1111-4000-8000-000000000006', 15, 4, 2,  482),
  ('a1b2c3d4-1111-4000-8000-000000000006', 16, 4, 10, 449),
  ('a1b2c3d4-1111-4000-8000-000000000006', 17, 3, 18, 195),
  ('a1b2c3d4-1111-4000-8000-000000000006', 18, 4, 12, 425)
ON CONFLICT (course_id, hole_number) DO NOTHING;

-- ============================================================
-- 7. Islamabad Golf Club (New) — 9 holes
-- ============================================================
INSERT INTO public.courses (id, name, location, description, holes_count, course_rating, slope_rating)
VALUES (
  'a1b2c3d4-1111-4000-8000-000000000007',
  'Islamabad Golf Club (New)',
  'Islamabad',
  'Historic 9-hole course established in 1967. Located on Murree Road in the heart of the capital, this par-35 layout stretches 2,974 yards from the championship tees.',
  9, NULL, NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_holes (course_id, hole_number, par, handicap_index, yardage) VALUES
  ('a1b2c3d4-1111-4000-8000-000000000007', 1, 4, 1, 375),
  ('a1b2c3d4-1111-4000-8000-000000000007', 2, 3, 6, 142),
  ('a1b2c3d4-1111-4000-8000-000000000007', 3, 4, 4, 236),
  ('a1b2c3d4-1111-4000-8000-000000000007', 4, 4, 5, 349),
  ('a1b2c3d4-1111-4000-8000-000000000007', 5, 4, 8, 494),
  ('a1b2c3d4-1111-4000-8000-000000000007', 6, 4, 7, 402),
  ('a1b2c3d4-1111-4000-8000-000000000007', 7, 5, 9, 472),
  ('a1b2c3d4-1111-4000-8000-000000000007', 8, 3, 2, 166),
  ('a1b2c3d4-1111-4000-8000-000000000007', 9, 4, 3, 338)
ON CONFLICT (course_id, hole_number) DO NOTHING;

-- ============================================================
-- 8. Rawalpindi Golf Club
-- ============================================================
INSERT INTO public.courses (id, name, location, description, holes_count, course_rating, slope_rating)
VALUES (
  'a1b2c3d4-1111-4000-8000-000000000008',
  'Rawalpindi Golf Club',
  'Rawalpindi, Punjab',
  'Historic 18-hole course located on Grand Trunk Road, Chaklala Cantt. Par-72 layout stretching 6,872 yards from the championship tees. One of Pakistan''s oldest golf clubs.',
  18, 74.3, 128.0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_holes (course_id, hole_number, par, handicap_index, yardage) VALUES
  ('a1b2c3d4-1111-4000-8000-000000000008', 1,  5, 5,  522),
  ('a1b2c3d4-1111-4000-8000-000000000008', 2,  3, 7,  199),
  ('a1b2c3d4-1111-4000-8000-000000000008', 3,  4, 11, 402),
  ('a1b2c3d4-1111-4000-8000-000000000008', 4,  4, 15, 375),
  ('a1b2c3d4-1111-4000-8000-000000000008', 5,  4, 9,  359),
  ('a1b2c3d4-1111-4000-8000-000000000008', 6,  4, 17, 346),
  ('a1b2c3d4-1111-4000-8000-000000000008', 7,  4, 1,  450),
  ('a1b2c3d4-1111-4000-8000-000000000008', 8,  3, 3,  232),
  ('a1b2c3d4-1111-4000-8000-000000000008', 9,  5, 13, 551),
  ('a1b2c3d4-1111-4000-8000-000000000008', 10, 4, 4,  385),
  ('a1b2c3d4-1111-4000-8000-000000000008', 11, 4, 2,  365),
  ('a1b2c3d4-1111-4000-8000-000000000008', 12, 3, 18, 175),
  ('a1b2c3d4-1111-4000-8000-000000000008', 13, 4, 6,  395),
  ('a1b2c3d4-1111-4000-8000-000000000008', 14, 5, 10, 510),
  ('a1b2c3d4-1111-4000-8000-000000000008', 15, 5, 12, 495),
  ('a1b2c3d4-1111-4000-8000-000000000008', 16, 3, 14, 185),
  ('a1b2c3d4-1111-4000-8000-000000000008', 17, 4, 16, 380),
  ('a1b2c3d4-1111-4000-8000-000000000008', 18, 4, 8,  426)
ON CONFLICT (course_id, hole_number) DO NOTHING;
