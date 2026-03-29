// CRM Integration - HubSpot Connector
export interface HubSpotConfig {
  apiKey: string;
  portalId: string;
}

export interface CRMContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
}

export class HubSpotConnector {
  private apiKey: string;
  private baseUrl = "https://api.hubapi.com";
  
  constructor(config: HubSpotConfig) {
    this.apiKey = config.apiKey;
  }
  
  async syncContact(email: string, data: Partial<CRMContact>): Promise<boolean> {
    try {
      // Create or update contact in HubSpot
      const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          properties: {
            email: data.email,
            firstname: data.firstName,
            lastname: data.lastName,
            company: data.company,
            phone: data.phone
          }
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error("HubSpot sync failed:", error);
      return false;
    }
  }
  
  async createTicketActivity(
    contactEmail: string, 
    ticketNumber: string,
    subject: string
  ): Promise<boolean> {
    try {
      // Create engagement (note) on contact timeline
      const response = await fetch(`${this.baseUrl}/engagements/v1/engagements`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          engagement: {
            type: "NOTE",
            timestamp: Date.now()
          },
          associations: {
            contactIds: [], // Would lookup contact ID
            companyIds: [],
            dealIds: []
          },
          metadata: {
            body: `Support ticket created: ${ticketNumber} - ${subject}`
          }
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error("HubSpot activity creation failed:", error);
      return false;
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/integrations/v1/me`, {
        headers: { "Authorization": `Bearer ${this.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Salesforce Connector
export interface SalesforceConfig {
  instanceUrl: string;
  accessToken: string;
  refreshToken: string;
}

export class SalesforceConnector {
  private config: SalesforceConfig;
  
  constructor(config: SalesforceConfig) {
    this.config = config;
  }
  
  async syncContact(email: string, data: Partial<CRMContact>): Promise<boolean> {
    try {
      // Query existing contact
      const queryResponse = await fetch(
        `${this.config.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(
          `SELECT Id FROM Contact WHERE Email = '${email}'`
        )}`,
        {
          headers: { "Authorization": `Bearer ${this.config.accessToken}` }
        }
      );
      
      if (!queryResponse.ok) return false;
      
      const queryResult = await queryResponse.json();
      
      const contactData = {
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email,
        Phone: data.phone,
        AccountId: null // Would need to lookup/create account
      };
      
      if (queryResult.totalSize > 0) {
        // Update existing
        const contactId = queryResult.records[0].Id;
        const updateResponse = await fetch(
          `${this.config.instanceUrl}/services/data/v58.0/sobjects/Contact/${contactId}`,
          {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${this.config.accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(contactData)
          }
        );
        return updateResponse.ok;
      } else {
        // Create new
        const createResponse = await fetch(
          `${this.config.instanceUrl}/services/data/v58.0/sobjects/Contact/`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${this.config.accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(contactData)
          }
        );
        return createResponse.ok;
      }
    } catch (error) {
      console.error("Salesforce sync failed:", error);
      return false;
    }
  }
  
  async createCase(
    contactEmail: string,
    subject: string,
    description: string,
    priority: string
  ): Promise<string | null> {
    try {
      // First get contact ID
      const queryResponse = await fetch(
        `${this.config.instanceUrl}/services/data/v58.0/query/?q=${encodeURIComponent(
          `SELECT Id FROM Contact WHERE Email = '${contactEmail}'`
        )}`,
        {
          headers: { "Authorization": `Bearer ${this.config.accessToken}` }
        }
      );
      
      if (!queryResponse.ok) return null;
      
      const queryResult = await queryResponse.json();
      if (queryResult.totalSize === 0) return null;
      
      const contactId = queryResult.records[0].Id;
      
      // Create Case
      const caseResponse = await fetch(
        `${this.config.instanceUrl}/services/data/v58.0/sobjects/Case/`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ContactId: contactId,
            Subject: subject,
            Description: description,
            Priority: priority,
            Origin: "Web"
          })
        }
      );
      
      if (caseResponse.ok) {
        const result = await caseResponse.json();
        return result.id;
      }
      return null;
    } catch (error) {
      console.error("Salesforce case creation failed:", error);
      return null;
    }
  }
}

export const crmConnectors = {
  hubspot: HubSpotConnector,
  salesforce: SalesforceConnector
};
