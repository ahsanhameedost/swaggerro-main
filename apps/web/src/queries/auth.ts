
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { me, updateProfile } from "@/modules/auth/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await me()).user,
    staleTime: 60_000,
    // A guest's 401 is already handled in me() (returns null); anything else
    // that fails shouldn't stall the navbar behind retry backoff.
    retry: false
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(["me"], user);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });
}
