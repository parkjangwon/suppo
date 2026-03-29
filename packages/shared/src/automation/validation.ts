export interface AutomationRule {
  id: string;
  name: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
}

export interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: string | number | boolean;
}

export interface AutomationAction {
  type: "assign_agent" | "set_status" | "set_priority" | "add_tag" | "send_email";
  params: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAutomationRule(rule: AutomationRule): ValidationResult {
  const errors: string[] = [];
  
  if (!rule.name?.trim()) {
    errors.push("Rule name is required");
  }
  
  if (!rule.conditions?.length) {
    errors.push("At least one condition is required");
  }
  
  if (!rule.actions?.length) {
    errors.push("At least one action is required");
  }
  
  // Validate condition fields
  for (const condition of rule.conditions || []) {
    if (!condition.field?.trim()) {
      errors.push("Condition field is required");
    }
    if (!condition.operator) {
      errors.push("Condition operator is required");
    }
  }
  
  // Validate action types
  for (const action of rule.actions || []) {
    if (!action.type) {
      errors.push("Action type is required");
    }
    if (!action.params) {
      errors.push("Action params are required");
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export interface ExecutionLog {
  ruleId: string;
  ruleName: string;
  ticketId: string;
  ticketNumber: string;
  executedAt: Date;
  success: boolean;
  actionsExecuted: string[];
  error?: string;
}

export class AutomationLogger {
  private logs: ExecutionLog[] = [];
  
  log(entry: ExecutionLog): void {
    this.logs.push(entry);
    // In production, this would write to database
    console.log(`[Automation] ${entry.ruleName} executed on ${entry.ticketNumber}: ${entry.success ? "success" : "failed"}`);
  }
  
  getLogs(ruleId?: string, limit: number = 100): ExecutionLog[] {
    let filtered = this.logs;
    if (ruleId) {
      filtered = filtered.filter(l => l.ruleId === ruleId);
    }
    return filtered.slice(-limit);
  }
}

export const automationLogger = new AutomationLogger();
