export interface Macro {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  variables: string[];
  category: string;
  isPersonal: boolean;
  createdById: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMacroInput {
  title: string;
  shortcut: string;
  content: string;
  variables?: string[];
  category: string;
  isPersonal: boolean;
}

export interface UpdateMacroInput {
  title?: string;
  shortcut?: string;
  content?: string;
  variables?: string[];
  category?: string;
  isPersonal?: boolean;
}
