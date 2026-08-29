# Communities on the customer profile

Add a Community card to the profile tab (below the verification card) where a verified customer can create one community or join one by invitation.

## Rules

- Only verified accounts (blue tick) can create or join. Unverified users see a locked card prompting them to verify first.
- One community per user — as creator or as member. Once in a community, the create/join actions disappear.
- Creator invites people by mobile number. If that number belongs to a registered, verified customer who is not already in a community, they receive a pending invite.
- The invited user sees the invite in their own Community card and can accept or decline. Accepting joins them to the community.
- Creator view: community name, member count, and the full member list (name, mobile, joined date), plus pending invites with the option to cancel.
- Member view: community name, creator name, and member count only — no member list, no other members' details.
- Creator can remove a member; a member can leave the community.

## What the user sees

Profile tab gets a "My Community" card:
- No community, verified: "Create a community" (name input) + list of pending invites received.
- No community, unverified: message to verify the account first.
- Creator: community header, invite-by-mobile form, member list, pending invites.
- Member: community header with creator name and member count only.

## Technical notes

Database (one migration, with GRANTs, RLS, updated_at triggers):

- `communities` — `name`, `creator_user_id` (unique, so one community per creator), timestamps.
- `community_members` — `community_id`, `user_id` (unique across all rows so a user belongs to at most one community), `joined_at`. Creator is inserted as a member row on creation.
- `community_invites` — `community_id`, `invited_mobile`, `invited_user_id`, `status` (pending/accepted/declined/cancelled), `created_by`, timestamps; unique on (community_id, invited_mobile) for pending invites.

Privacy (the part RLS alone can't do): members must not read other members' rows. Approach:
- `community_members` SELECT policy allows a row only when `user_id = auth.uid()` or the caller is the community creator. So a member reading the table sees only themselves.
- Public community info comes from security-definer functions:
  - `get_my_community()` — returns community name, creator display name, member count, and whether the caller is the creator.
  - `invite_to_community(_mobile text)` — validates caller is a verified creator, resolves the mobile to a verified profile not already in a community, creates the pending invite; returns a clear error message otherwise (mobile not registered / not verified / already in a community).
  - `respond_to_community_invite(_invite_id uuid, _accept boolean)` — validates the invite belongs to the caller and the caller is verified and community-free, then inserts the member row and marks the invite accepted.
- Invites are matched against the caller's `profiles.mobile_number`, normalised to the last 10 digits (same normalisation the verification card uses).

Frontend:
- New `src/components/customer/CommunityCard.tsx` handling all states, calling the RPCs above via the Supabase client.
- Rendered in `src/pages/customer/Profile.tsx` in the profile section, right after `VerifyAccountCard`.
- Verification status read from `profiles.is_verified`.
