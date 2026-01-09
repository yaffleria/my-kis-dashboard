"use client";

import { useEffect } from "react";
import { useAccountStore } from "@/store";
import type { Account } from "@/types";

interface EnvInitializerProps {
  // JSON string of accounts from environment variable
  envAccountsJson?: string;
}

interface RawEnvAccount {
  accountNo?: string;
  productCode?: string;
  accountName?: string;
  name?: string;
  isPension?: boolean;
  [key: string]: unknown;
}

export function EnvInitializer({ envAccountsJson }: EnvInitializerProps) {
  const { accounts, setSelectedAccount, setAccounts } = useAccountStore();

  useEffect(() => {
    // .env 설정이 있으면 Store를 강제로 동기화 (캐싱 문제 해결)
    if (envAccountsJson) {
      try {
        const parsed = JSON.parse(envAccountsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validAccounts: Account[] = parsed
            .map((item: RawEnvAccount) => {
              const accountNo = String(item.accountNo || "").replace(
                /[^0-9]/g,
                ""
              );
              if (!accountNo) return null;

              let productCode = String(item.productCode || "01").trim();
              if (productCode.length === 1)
                productCode = productCode.padStart(2, "0");

              return {
                accountNo,
                productCode: productCode,
                accountName: item.accountName || item.name || "환경설정 계좌",
                isPension: false,
              };
            })
            .filter((a): a is Account => a !== null);

          // 기존 스토어 상태와 비교하여 다를 경우에만 업데이트 (불필요한 리렌더링 방지)
          const currentJson = JSON.stringify(accounts);
          const newJson = JSON.stringify(validAccounts);

          if (currentJson !== newJson) {
            console.log(
              "[EnvInitializer] Syncing accounts from environment variables..."
            );
            setAccounts(validAccounts);

            // 선택된 계좌가 없거나 유효하지 않으면 첫 번째 계좌 선택
            const currentSelectedValid = validAccounts.some(
              (a) =>
                a.accountNo === useAccountStore.getState().selectedAccountNo
            );
            if (!currentSelectedValid && validAccounts.length > 0) {
              setSelectedAccount(validAccounts[0].accountNo);
            }
          }
        }
      } catch (e) {
        console.error("[EnvInitializer] Failed to parse KIS_ACCOUNTS:", e);
      }
    }
  }, [envAccountsJson, setAccounts, setSelectedAccount, accounts]); // accounts 의존성 추가 (내부 비교 로직으로 무한 루프 방지됨)

  return null;
}
