import { Request, Response } from "express";
import axios from "axios";
import { CONFIG } from "../config/vicidial";

const { API_USERNAME, API_PASSWORD, BASE_URL } = CONFIG;
const allowedDispositions = [
  "SALE",
  "NI",
  "HUP",
  "BAOBJ",
  "SSOBJ",
  "DAIR",
  "ALSale",
];

const sanitizePhoneNumber = (phone_number: string): string => {
  // Remove all non-digit characters
  const digitsOnly = phone_number.replace(/\D/g, "");

  // If it starts with +, you may want to keep the country code
  return digitsOnly;
};

function validateEnvVars(res: Response): boolean {
  if (!API_USERNAME || !API_PASSWORD || !BASE_URL) {
    res.status(500).json({ error: "Vicidial API credentials are not set" });
    return false;
  }
  return true;
}

export const addLead = async (req: Request, res: Response): Promise<any> => {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    street_address,
    city,
    state,
    postal_code,
    disposition,
    date_of_birth,
    source,
    country_code,
  } = req.body?.customData;

  // Validate environment variables
  if (!validateEnvVars(res)) return;

  // Validate required fields
  if (!phone_number) {
    return res.status(400).json({ error: "Phone number is required" });
  } else if (!first_name) {
    return res.status(400).json({ error: "First Name is required" });
  } else if (!last_name) {
    return res.status(400).json({ error: "Last Name is required" });
  } else if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  if (disposition && !allowedDispositions.includes(disposition)) {
    return res.status(400).json({ error: "Invalid disposition value" });

  }

  // Sanitize and validate phone number
  const sanitizedPhoneNumber = sanitizePhoneNumber(phone_number);
  if (
    !sanitizedPhoneNumber ||
    sanitizedPhoneNumber.length < 6 ||
    sanitizedPhoneNumber.length > 16
  ) {
    return res.status(400).json({ error: "Invalid phone number format" });
  }

  // Prepare URL parameters
  const params = new URLSearchParams();
  params.append("user", API_USERNAME || "");
  params.append("pass", API_PASSWORD || "");
  params.append("function", "add_lead");
  params.append("source", source || "GoHighLevel");
  params.append("phone_number", sanitizedPhoneNumber);
  // params.append("list_id", "1234"); // Replace with your actual list ID or make it configurable
  params.append("duplicate_check", "DUPSYS"); // More comprehensive duplicate check

  // Add basic contact info
  if (first_name) params.append("first_name", first_name);
  if (last_name) params.append("last_name", last_name);
  if (email) params.append("email", email);
  if (country_code) params.append("country_code", country_code);

  // Add address info
  if (street_address) params.append("address1", street_address);
  if (city) params.append("city", city);
  if (state) params.append("state", state);
  if (postal_code) params.append("postal_code", postal_code);

  // Add additional fields
  if (disposition) params.append("status", disposition);
  if (date_of_birth) {
    // Convert date format to YYYY-MM-DD if needed
    const formattedDob = formatDateOfBirth(date_of_birth);
    if (formattedDob) params.append("date_of_birth", formattedDob);
  }

  // // Add custom fields if needed
  // params.append("custom_fields", "Y");
  // // Add any additional custom fields here

  try {
    const url = `${BASE_URL}?${params.toString()}`;
    const { data } = await axios.get(url, { timeout: 10000 });

    console.log("✅ Vicidial API Response:", data);

    if (typeof data === "string" && data.includes("ERROR")) {
      throw new Error(data);
    }

    res.status(200).json({
      success: true,
      message: "Lead added successfully",
      response: data,
    });
  } catch (error: any) {
    console.error("❌ Error calling Vicidial API:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to add lead to Vicidial",
      details: error.message,
    });
  }
};

// Helper function to format date of birth
function formatDateOfBirth(dob: string): string | null {
  try {
    // Implement your date parsing logic here
    // Example: Convert "Sep 2nd 1995" to "1995-09-02"
    return new Date(dob).toISOString().split("T")[0];
  } catch (e) {

    return null;
  }
}

export const updateLead = async (req: Request, res: Response): Promise<any> => {
  const {
    leadId,
    phone_number,
    first_name,
    last_name,
    email,
    street_address,
    city,
    state,
    postal_code,
    country_code,
    disposition,
    date_of_birth,
    source = "GoHighLevel",
  } = req.body?.customData;

  if (!validateEnvVars(res)) return;

  // Validate at least one identifier exists
  if (!phone_number && !leadId) {
    return res.status(400).json({
      success: false,
      error: "Either leadId or phoneNumber must be provided",
    });
  }

  try {
    const params = new URLSearchParams({
      source: source,
      user: API_USERNAME || "",
      pass: API_PASSWORD || "",
      function: "update_lead",
    });

    // Identifier handling
    if (leadId) {
      params.append("lead_id", leadId);
      params.append("search_method", "LEAD_ID");
    } else if (phone_number) {
      const sanitizedPhone = phone_number.replace(/\D/g, "");
      params.append("phone_number", sanitizedPhone);
      params.append("search_method", "PHONE_NUMBER");
      params.append("search_location", "SYSTEM");
    }

    if (!allowedDispositions.includes(disposition)) {
      return res.status(400).json({ error: "Invalid disposition value" });

    }

    // Documented optional fields
    if (first_name) params.append("first_name", first_name.substring(0, 30));
    if (last_name) params.append("last_name", last_name.substring(0, 30));
    if (email) params.append("email", email.substring(0, 70));
    if (street_address)
      params.append("address1", street_address.substring(0, 100));
    if (city) params.append("city", city.substring(0, 50));
    if (state) params.append("state", state.substring(0, 2));
    if (postal_code) params.append("postal_code", postal_code.substring(0, 10));
    if (country_code)
      params.append("country_code", country_code.substring(0, 3));
    if (disposition) params.append("status", disposition.substring(0, 6));

    // Special field handling
    if (date_of_birth) {
      const formattedDOB = formatDateToYYYYMMDD(date_of_birth);
      if (formattedDOB) params.append("date_of_birth", formattedDOB);
    }

    // Documented settings
    params.append("custom_fields", "Y"); // Enable custom fields if any
    params.append("records", "1"); // Only update one record

    const url = `${BASE_URL}?${params.toString()}`;
    const { data } = await axios.get(url, { timeout: 10000 });

    // Parse VICIdial response
    if (typeof data === "string") {
      if (data.includes("ERROR")) {
        if (data.includes("NO MATCHES FOUND")) {
          return res.status(404).json({
            success: false,
            error: "No matching lead found",
            details: data,
          });
        }
        throw new Error(data);
      }

      // Success response parsing
      const match = data.match(/SUCCESS.*\|(\d+)\|/);
      return res.status(200).json({
        success: true,
        message: "Lead updated successfully",
        // lead_id: match ? match[1] : null,
        response: data,
      });
    }

    throw new Error("Invalid response format from VICIdial");
  } catch (error: any) {
    console.error("Update error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to update lead",
      details: error.message,
      attempted_payload: req.body,
    });
  }
};

// Helper function (same as in addLead)
function formatDateToYYYYMMDD(dateString: string): string | null {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  } catch (e) {
    console.warn("Date format error:", e);
    return null;
  }
}





export const handleCallStatus = async (req: Request, res: Response): Promise<any> => {
  const {
    phone_number,
   
    disposition,
  } = req.body || {};

  if ( !phone_number  || !disposition) {
    
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (disposition && !allowedDispositions.includes(disposition)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid disposition. Lead not processed.',
      disposition,
    });
  }

  const headers = {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const rawPhone = sanitizePhoneNumber(phone_number);
  const formattedPhone = `+1${rawPhone}`;

  try {
    // Step 1: Fetch all contacts
    const baseUrl = `${process.env.GHL_BASE_URL}/contacts`;
    let allContacts: any[] = [];
    let nextPageToken: string | null = null;

    do {
      const url: any = nextPageToken
        ? `${baseUrl}?limit=100&nextPageToken=${nextPageToken}`
        : `${baseUrl}?limit=100`;

      const response = await axios.get(url, { headers });
      const { contacts = [], meta = {} } = response.data;

      allContacts = [...allContacts, ...contacts];
      nextPageToken = meta.nextPageToken || null;
    } while (nextPageToken);

    // Step 2: Filter contact by phone number
    const contact = allContacts.find(c => c.phone === formattedPhone);

    if (!contact?.id) {

      return res.status(404).json({ error: 'Contact not found in GoHighLevel' });
    }

    // Step 3: Update contact with new "state"
    const updateUrl = `${process.env.GHL_BASE_URL}/contacts/${contact.id}`;

    const updatePayload = {
      customField: [
        {
          id: contact?.customField[0]?.id || 'I8LvfhNDaFTojQz7YJPA', // Replace with your actual custom field ID
          value: disposition,
        },
      ],
    };


    try {
      const updateResponse = await axios.put(updateUrl, updatePayload, { headers });
      console.log('✅ Disposition (state) updated in GoHighLevel:', updateResponse.data);
    } catch (updateError: any) {
      console.error('❌ Error during contact update:', updateError.response?.data || updateError.message);
      return res.status(500).json({ error: 'Failed to update disposition in GoHighLevel' });
    }

    return res.status(200).json({ message: 'Call status and disposition updated successfully' });

  } catch (error: any) {
    console.error('❌ Unexpected server error:', error.message);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
};





export const getAllGHLContacts = async (req: Request, res: Response): Promise<any> => {
  const url = `${process.env.GHL_BASE_URL}/contacts/?limit=100`;
  const headers = {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.get(url, { headers });
    const contacts = response.data?.contacts || [];


    return res.status(200).json({ contacts });

  } catch (error: any) {
    console.error('❌ Error fetching GHL contacts:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to fetch contacts from GoHighLevel' });
  }
};





export const getGHLContactByPhone = async (req: Request, res: Response): Promise<any> => {
  const { phone } = req.query;

  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid phone number in query params' });
  }

  const rawPhone = phone.replace(/[^\d]/g, '');
  const formattedPhone = `+1${rawPhone}`; // Adjust country code if needed

  console.log("formattedPhone", formattedPhone)

  const searchUrl = `${process.env.GHL_BASE_URL}/contacts/search?phone=${encodeURIComponent(formattedPhone)}`;
  const headers = {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.get(searchUrl, { headers });
    const contact = response.data?.contacts?.[0];

    if (!contact) {
      return res.status(404).json({ message: 'No contact found for the provided phone number' });
    }

    return res.status(200).json({ contact });
  } catch (error: any) {
    console.error('❌ Error searching contact by phone:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to search contact by phone' });
  }
};






