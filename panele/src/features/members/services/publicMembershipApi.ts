import httpClient from '../../../shared/services/httpClient';

export interface PublicMembershipInquiryResponse {
  isMember: boolean;
  memberSince: string | null;
}

export const postPublicMembershipInquiry = async (
  nationalId: string,
  inquiryToken?: string,
): Promise<PublicMembershipInquiryResponse> => {
  const token = inquiryToken?.trim();
  const res = await httpClient.post<PublicMembershipInquiryResponse>(
    '/public/membership-inquiry',
    { nationalId },
    token
      ? { headers: { 'X-Membership-Inquiry-Token': token } }
      : undefined,
  );
  return res.data;
};
