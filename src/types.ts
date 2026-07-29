export interface AuditTransaction {
  date: string;
  amount: number | string;
  vendor: string;
  account_code: string;
  approved_by: string | null;
  department: string;
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  missingColumns: string[];
  foundColumns: string[];
  totalRows: number;
  data: AuditTransaction[];
}

export interface PlantedAnomaly {
  type: string;
  description: string;
  affectedRows: AuditTransaction[];
  severity: 'high' | 'medium' | 'warning';
}
