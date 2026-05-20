"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { CustomerUser } from "@/lib/types";
import {
  generateCustomerUserId,
  generateSalt,
  hashPassword,
  verifyPassword,
  hashPin,
  verifyPin,
  isValidPin,
} from "@/lib/customer-auth";
import {
  insertCustomerUser,
  fetchCustomerUserByMobile,
  fetchCustomerUserById,
  updateCustomerUserLastLogin,
  updateCustomerUserPin,
} from "@/lib/supabase-db";

const STORAGE_KEY = "vibgyor-customer";

interface CustomerSession {
  id: string;
  name: string;
  mobile: string;
  accountNumber: string;
  hasPin: boolean;
}

interface CustomerAuthState {
  customer: CustomerSession | null;
  isLoading: boolean;
  register: (
    name: string,
    mobile: string,
    accountNumber: string,
    password: string,
    pin: string
  ) => Promise<{ success: boolean; error?: string }>;
  login: (
    mobile: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setupPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  verifyCustomerPin: (pin: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

function sessionFromUser(user: CustomerUser): CustomerSession {
  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    accountNumber: user.accountNumber,
    hasPin: Boolean(user.pinHash && user.pinSalt),
  };
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCustomer(JSON.parse(stored));
    } catch {
      // ignore invalid JSON
    }
    setIsLoading(false);
  }, []);

  const saveSession = (session: CustomerSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setCustomer(session);
  };

  const register = useCallback(
    async (
      name: string,
      mobile: string,
      accountNumber: string,
      password: string,
      pin: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!/^\d{10}$/.test(mobile)) {
        return { success: false, error: "Mobile number must be 10 digits" };
      }
      if (password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters" };
      }
      if (!isValidPin(pin)) {
        return { success: false, error: "PIN must be 4 digits" };
      }

      const existing = await fetchCustomerUserByMobile(mobile);
      if (existing) {
        return { success: false, error: "Mobile number already registered" };
      }

      const salt = generateSalt();
      const hash = await hashPassword(password, salt);
      const pinSalt = generateSalt();
      const pinHashed = await hashPin(pin, pinSalt);
      const now = new Date().toISOString();
      const user: CustomerUser = {
        id: generateCustomerUserId(),
        name: name.trim(),
        mobile,
        accountNumber: accountNumber.trim(),
        passwordHash: hash,
        passwordSalt: salt,
        pinHash: pinHashed,
        pinSalt,
        pinUpdatedAt: now,
        createdAt: now,
        lastLoginAt: now,
      };

      await insertCustomerUser(user);
      saveSession(sessionFromUser(user));
      return { success: true };
    },
    []
  );

  const login = useCallback(
    async (
      mobile: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      const user = await fetchCustomerUserByMobile(mobile);
      if (!user) {
        return { success: false, error: "Invalid mobile number or password" };
      }

      const valid = await verifyPassword(password, user.passwordSalt, user.passwordHash);
      if (!valid) {
        return { success: false, error: "Invalid mobile number or password" };
      }

      await updateCustomerUserLastLogin(user.id);
      saveSession(sessionFromUser(user));
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCustomer(null);
  }, []);

  const setupPin = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      if (!customer) return { success: false, error: "Not logged in" };
      if (!isValidPin(pin)) return { success: false, error: "PIN must be 4 digits" };

      const pinSalt = generateSalt();
      const pinHashed = await hashPin(pin, pinSalt);
      await updateCustomerUserPin(customer.id, pinHashed, pinSalt);
      saveSession({ ...customer, hasPin: true });
      return { success: true };
    },
    [customer]
  );

  const verifyCustomerPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!customer) return false;
      const user = await fetchCustomerUserById(customer.id);
      if (!user || !user.pinHash || !user.pinSalt) return false;
      return verifyPin(pin, user.pinSalt, user.pinHash);
    },
    [customer]
  );

  const refreshSession = useCallback(async () => {
    if (!customer) return;
    const user = await fetchCustomerUserById(customer.id);
    if (user) saveSession(sessionFromUser(user));
  }, [customer]);

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isLoading,
        register,
        login,
        logout,
        setupPin,
        verifyCustomerPin,
        refreshSession,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthState {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
