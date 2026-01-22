-- Example INSERT statement for call_records
-- Note: Do NOT include 'id' - it will be auto-generated
-- Note: Do NOT include 'created_at' or 'updated_at' - they have defaults

INSERT INTO call_records (
    transcript,
    cost,
    call_recording,
    summary,
    name,
    company,
    email,
    phone,
    address,
    item,
    quote_number,
    quote,
    grand_total
) VALUES (
    'User: Hello?\nAI: Hi. It''s Mia from MergeLab...',
    0.033,
    'https://storage.vapi.ai/019be755-98af-7dd7-b734-941bc5102ea3-1769112741242-23000732-65bc-4d37-9c9a-fb29860167b7-mono.mp3',
    'Mia from MerchLab called Nico to follow up on an unpaid quote...',
    'Nico Nel',
    'Kedoe Trading',
    'ncnel92@gmail.com',
    '0693475825',
    '1 Safraan Street, Cape Town, , W Cape, 8000',
    '180g Barron V-Neck T-Shirt (White - LAR - 2), 180g Barron V-Neck T-Shirt (White - XL - 4), 180g Barron V-Neck T-Shirt (White - 2XL - 2)',
    'Q732-9XYER',
    'https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/audit-reports/Q732-9XYER.pdf',
    'R1052.98'
);
