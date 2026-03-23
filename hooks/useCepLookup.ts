"use client";

import { useState, useCallback } from "react";

interface CepResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export function useCepLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (cep: string): Promise<CepResult | null> => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length !== 8) {
      setError("CEP deve ter 8 digitos.");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      if (!res.ok) throw new Error("Erro ao buscar CEP.");

      const data = await res.json();
      if (data.erro) {
        setError("CEP nao encontrado.");
        return null;
      }

      return {
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      };
    } catch {
      setError("Erro de conexao ao buscar CEP.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading, error };
}
