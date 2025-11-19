import { 
  AlertCircle, 
  Wrench, 
  Trash2, 
  TreePine, 
  Car, 
  Building2, 
  Droplet, 
  Zap, 
  Phone, 
  Wifi,
  FileText,
  HelpCircle,
  type LucideIcon
} from "lucide-react";

const categoryIconMap: Record<string, LucideIcon> = {
  "pothole": Car,
  "road": Car,
  "traffic": Car,
  "streetlight": Zap,
  "water": Droplet,
  "sewage": Droplet,
  "garbage": Trash2,
  "waste": Trash2,
  "tree": TreePine,
  "parks": TreePine,
  "building": Building2,
  "infrastructure": Building2,
  "internet": Wifi,
  "telecom": Phone,
  "other": HelpCircle,
  "general": FileText,
  "complaint": AlertCircle,
  "maintenance": Wrench,
};

export function getCategoryIcon(category: string | null | undefined): LucideIcon {
  if (!category) return HelpCircle;
  const normalized = category.toLowerCase().trim();
  for (const [key, Icon] of Object.entries(categoryIconMap)) {
    if (normalized.includes(key)) return Icon;
  }
  return HelpCircle;
}

export function CategoryIcon({ category, className = "w-4 h-4" }: { category: string | null | undefined; className?: string }) {
  const Icon = getCategoryIcon(category);
  return <Icon className={className} />;
}

