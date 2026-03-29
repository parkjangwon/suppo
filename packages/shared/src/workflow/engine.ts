// Enterprise Workflow Engine - Visual workflow with states and transitions
export interface WorkflowState {
  id: string;
  name: string;
  type: "start" | "in_progress" | "waiting" | "resolved" | "closed";
  color: string;
}

export interface WorkflowTransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  name: string;
  conditions?: TransitionCondition[];
  actions?: TransitionAction[];
}

export interface TransitionCondition {
  type: "field_equals" | "has_permission" | "time_elapsed";
  field?: string;
  value?: string;
  permission?: string;
  minutes?: number;
}

export interface TransitionAction {
  type: "send_notification" | "update_field" | "assign_agent" | "webhook";
  params: Record<string, unknown>;
}

export class WorkflowEngine {
  private states: Map<string, WorkflowState> = new Map();
  private transitions: Map<string, WorkflowTransition> = new Map();
  
  addState(state: WorkflowState): void {
    this.states.set(state.id, state);
  }
  
  addTransition(transition: WorkflowTransition): void {
    this.transitions.set(transition.id, transition);
  }
  
  getAvailableTransitions(currentStateId: string): WorkflowTransition[] {
    return Array.from(this.transitions.values())
      .filter(t => t.fromStateId === currentStateId);
  }
  
  canTransition(
    transitionId: string, 
    ticketData: Record<string, unknown>,
    userPermissions: string[]
  ): boolean {
    const transition = this.transitions.get(transitionId);
    if (!transition) return false;
    
    if (!transition.conditions) return true;
    
    return transition.conditions.every(condition => {
      switch (condition.type) {
        case "field_equals":
          return ticketData[condition.field!] === condition.value;
        case "has_permission":
          return userPermissions.includes(condition.permission!);
        case "time_elapsed":
          // Check if time elapsed since ticket creation/update
          return true; // Simplified
        default:
          return true;
      }
    });
  }
  
  executeTransition(
    transitionId: string,
    ticketData: Record<string, unknown>
  ): { newStateId: string; actions: TransitionAction[] } | null {
    const transition = this.transitions.get(transitionId);
    if (!transition) return null;
    
    return {
      newStateId: transition.toStateId,
      actions: transition.actions || []
    };
  }
}

// Predefined enterprise workflows
export const defaultSupportWorkflow = new WorkflowEngine();

// Initialize default workflow
defaultSupportWorkflow.addState({
  id: "new",
  name: "New",
  type: "start",
  color: "#94a3b8"
});

defaultSupportWorkflow.addState({
  id: "open",
  name: "Open",
  type: "in_progress",
  color: "#3b82f6"
});

defaultSupportWorkflow.addState({
  id: "in_progress",
  name: "In Progress",
  type: "in_progress",
  color: "#f59e0b"
});

defaultSupportWorkflow.addState({
  id: "waiting_customer",
  name: "Waiting for Customer",
  type: "waiting",
  color: "#8b5cf6"
});

defaultSupportWorkflow.addState({
  id: "waiting_third_party",
  name: "Waiting for 3rd Party",
  type: "waiting",
  color: "#ec4899"
});

defaultSupportWorkflow.addState({
  id: "resolved",
  name: "Resolved",
  type: "resolved",
  color: "#10b981"
});

defaultSupportWorkflow.addState({
  id: "closed",
  name: "Closed",
  type: "closed",
  color: "#64748b"
});

// Add transitions
defaultSupportWorkflow.addTransition({
  id: "new_to_open",
  fromStateId: "new",
  toStateId: "open",
  name: "Assign Ticket"
});

defaultSupportWorkflow.addTransition({
  id: "open_to_in_progress",
  fromStateId: "open",
  toStateId: "in_progress",
  name: "Start Working"
});

defaultSupportWorkflow.addTransition({
  id: "in_progress_to_waiting_customer",
  fromStateId: "in_progress",
  toStateId: "waiting_customer",
  name: "Request Info"
});

defaultSupportWorkflow.addTransition({
  id: "waiting_customer_to_in_progress",
  fromStateId: "waiting_customer",
  toStateId: "in_progress",
  name: "Receive Response"
});

defaultSupportWorkflow.addTransition({
  id: "in_progress_to_resolved",
  fromStateId: "in_progress",
  toStateId: "resolved",
  name: "Resolve"
});

defaultSupportWorkflow.addTransition({
  id: "resolved_to_closed",
  fromStateId: "resolved",
  toStateId: "closed",
  name: "Close"
});

defaultSupportWorkflow.addTransition({
  id: "resolved_to_open",
  fromStateId: "resolved",
  toStateId: "open",
  name: "Reopen"
});
