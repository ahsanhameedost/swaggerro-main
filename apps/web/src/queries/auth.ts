
import { useQuery } from "@tanstack/react-query";
import { me } from "@/modules/auth/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await me()).user,
    staleTime: 60_000
  });
}
