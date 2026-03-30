"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { CustomerUser } from "@/lib/types";
import {
  generateCustomerUserId,
  generateSalt,
  hashPassword,
  verifyPassword,
} from "@/lib/customer-auth";
import {
  insertCustomerUser,
  fetchCustomerUserByMobile,
  updateCustomerUserLastLogin,
} from "@/lib/supabase-db";

const STORAGE_KEY = "vibgyor-customer";

interface CustomerSession {
  id: string;
  name: string;
  mobile: string;
  accountNumber: string;
}

interface CustomerAuthState {
  customer: CustomerSession | null;
  isLoading: boolean;
  register: (
    name: string,
    mobile: string,
    accountNumber: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  login: (
    mobile: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

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
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!/^\d{10}$/.test(mobile)) {
        return { success: false, error: "Mobile number must be 10 digits" };
      }
      if (password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters" };
      }

      const existing = await fetchCustomerUserByMobile(mobile);
      if (existing) {
        return { success: false, error: "Mobile number already registered" };
      }

      const salt = generateSalt();
      const hash = await hashPassword(password, salt);
      const now = new Date().toISOString();
      const user: CustomerUser = {
        id: generateCustomerUserId(),
        name: name.trim(),
        mobile,
        accountNumber: accountNumber.trim(),
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: now,
        lastLoginAt: now,
      };

      await insertCustomerUser(user);
      saveSession({ id: user.id, name: user.name, mobile: user.mobile, accountNumber: user.accountNumber });
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
      saveSession({ id: user.id, name: user.name, mobile: user.mobile, accountNumber: user.accountNumber });
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCustomer(null);
  }, []);

  return (
    <CustomerAuthContext.Provider value={{ customer, isLoading, register, login, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthState {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
