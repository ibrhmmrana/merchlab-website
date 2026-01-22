// Example: How to insert call records using Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function insertCallRecord(callData: {
  transcript: string;
  cost: number;
  call_recording: string;
  summary: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  item: string;
  quote_number: string;
  quote: string;
  grand_total: string;
}) {
  // IMPORTANT: Do NOT include 'id', 'created_at', or 'updated_at'
  // They are auto-generated/have defaults
  
  const { data, error } = await supabase
    .from('call_records')
    .insert({
      transcript: callData.transcript,
      cost: callData.cost,
      call_recording: callData.call_recording,
      summary: callData.summary,
      name: callData.name,
      company: callData.company,
      email: callData.email,
      phone: callData.phone,
      address: callData.address,
      item: callData.item,
      quote_number: callData.quote_number,
      quote: callData.quote,
      grand_total: callData.grand_total,
      // DO NOT include: id, created_at, updated_at
    })
    .select();

  if (error) {
    console.error('Error inserting call record:', error);
    throw error;
  }

  return data;
}

// Example usage:
const exampleCallData = {
  transcript: "User: Hello?\nAI: Hi. It's Mia from MergeLab...",
  cost: 0.033,
  call_recording: "https://storage.vapi.ai/...",
  summary: "Mia from MerchLab called Nico...",
  name: "Nico Nel",
  company: "Kedoe Trading",
  email: "ncnel92@gmail.com",
  phone: "0693475825",
  address: "1 Safraan Street, Cape Town, , W Cape, 8000",
  item: "180g Barron V-Neck T-Shirt (White - LAR - 2), 180g Barron V-Neck T-Shirt (White - XL - 4), 180g Barron V-Neck T-Shirt (White - 2XL - 2)",
  quote_number: "Q732-9XYER",
  quote: "https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/audit-reports/Q732-9XYER.pdf",
  grand_total: "R1052.98"
};

// insertCallRecord(exampleCallData);
