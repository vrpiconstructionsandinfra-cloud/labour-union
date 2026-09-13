import { Request, Response } from "express";
import fs from "fs";
import path from "path";

export interface TradeWageItem {
  id: string;
  name: string;
  dailyWage: number;
  monthlyWage: number;
  category?: string;
  description?: string;
}

export interface WageConfigData {
  registrationFee: number;
  agentRegistrationFee?: number;
  isRegistrationFeeMandatory: boolean;
  lockAgentWages: boolean;
  tradeWages: TradeWageItem[];
  updatedAt: string;
  updatedBy?: string;
}

const DEFAULT_CONFIG: WageConfigData = {
  registrationFee: 500,
  agentRegistrationFee: 1000,
  isRegistrationFeeMandatory: true,
  lockAgentWages: false,
  tradeWages: [
    { id: "1", name: "General Helper / Helper", dailyWage: 600, monthlyWage: 18000, category: "Unskilled / Semi-skilled", description: "General site support, material handling & cleaning" },
    { id: "2", name: "Mason / Carpenter", dailyWage: 850, monthlyWage: 25500, category: "Skilled Trade", description: "Bricklaying, plastering, formwork, carpentry" },
    { id: "3", name: "Electrician", dailyWage: 950, monthlyWage: 28500, category: "Certified Skilled", description: "Wiring, conduits, panels, installation & safety" },
    { id: "4", name: "Plumber", dailyWage: 950, monthlyWage: 28500, category: "Certified Skilled", description: "Piping, fittings, sanitation & water supply systems" },
    { id: "5", name: "Scaffolder", dailyWage: 900, monthlyWage: 27000, category: "Skilled Trade", description: "Erection, inspection, high-rise structural scaffolding" },
    { id: "6", name: "Welder / Fabricator", dailyWage: 1000, monthlyWage: 30000, category: "Specialized Technical", description: "Structural welding, arc/TIG, fabrication & cutting" },
    { id: "7", name: "Site Technician / Supervisor", dailyWage: 1100, monthlyWage: 33000, category: "Technical Specialist", description: "Site machinery, heavy equipment operation & quality checks" }
  ],
  updatedAt: new Date().toISOString(),
  updatedBy: "Super Admin (Default Master)"
};

const CONFIG_FILE_PATH = path.join(__dirname, "../../wage_config.json");

// Helper to read config safely
const readConfig = (): WageConfigData => {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Error reading wage config file, returning default:", err);
  }
  return DEFAULT_CONFIG;
};

// Helper to write config safely
const writeConfig = (config: WageConfigData): void => {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing wage config file:", err);
  }
};

export const getWageConfig = async (req: Request, res: Response) => {
  try {
    const config = readConfig();
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error: any) {
    console.error("Error fetching wage config:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch wage configuration"
    });
  }
};

export const updateWageConfig = async (req: Request, res: Response) => {
  try {
    const { registrationFee, isRegistrationFeeMandatory, lockAgentWages, tradeWages } = req.body;
    const user = (req as any).user;

    const currentConfig = readConfig();

    const updatedConfig: WageConfigData = {
      registrationFee: typeof registrationFee === "number" ? Math.max(0, registrationFee) : currentConfig.registrationFee,
      isRegistrationFeeMandatory: typeof isRegistrationFeeMandatory === "boolean" ? isRegistrationFeeMandatory : currentConfig.isRegistrationFeeMandatory,
      lockAgentWages: typeof lockAgentWages === "boolean" ? lockAgentWages : currentConfig.lockAgentWages,
      tradeWages: Array.isArray(tradeWages) && tradeWages.length > 0 ? tradeWages : currentConfig.tradeWages,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name ? `${user.name} (${user.role})` : "Super Admin"
    };

    writeConfig(updatedConfig);

    return res.status(200).json({
      success: true,
      message: "Wage & Registration Fee configuration updated successfully by Super Admin",
      data: updatedConfig
    });
  } catch (error: any) {
    console.error("Error updating wage config:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update wage configuration"
    });
  }
};
