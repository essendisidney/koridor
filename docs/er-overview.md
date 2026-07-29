# Entity Relationship Overview — Phases 1–6 + Stage 3.5

```mermaid
erDiagram
  Trade ||--o{ TradeParticipant : graph
  Trade ||--o{ TradeMilestone : tracks
  Trade ||--o{ TradeEvidence : proves
  Trade ||--o{ TradeEvent : timeline
  Trade ||--o{ Rfq : may_start
  Trade ||--o{ Contract : commercial
  Trade ||--o{ ComplianceCertificate : certs
  Organisation ||--o{ Trade : buyer_or_seller
  Organisation ||--o{ Wallet : holds
  Wallet ||--o{ LedgerEntry : records
  EscrowRequest ||--o| EscrowAccount : opens
  EscrowAccount }o--|| Wallet : holds_from
  ShipmentRequest ||--o| Shipment : books
  Shipment ||--o{ TrackingEvent : tracks
  Shipment ||--o| ProofOfDelivery : confirms
```

The **Trade Passport** is the parent hub. Contract remains the signed commercial instrument; escrow/shipment attach through contract and surface in the Trade Workspace.

```mermaid
erDiagram
  User ||--o{ UserRole : has
  User ||--o{ RefreshToken : has
  User ||--o| UserSettings : has
  User ||--o{ OrganisationMember : joins
  User ||--o{ Organisation : owns
  User ||--o{ KycProfile : verifies
  Organisation ||--o{ OrganisationMember : has
  Organisation ||--o{ OrganisationInvite : invites
  Organisation ||--o| TrustProfile : scores
  Organisation ||--o{ Document : stores
  Organisation ||--o{ OrgContact : contacts
  Organisation ||--o{ VerificationCase : submits
  Organisation ||--o| RegistryProfile : lists
  Organisation ||--o{ ComplianceCertificate : issues
  Organisation ||--o{ Rfq : posts
  Organisation ||--o{ Contract : trades
  VerificationCase ||--o{ Document : evidence
  VerificationCase ||--o{ VerificationEvent : timeline
  Contract ||--o{ ComplianceCertificate : may_link
  ComplianceCertificate ||--o{ ComplianceApproval : reviews
  ComplianceCertificate ||--o{ ComplianceEvent : timeline
  User ||--o{ Notification : receives
  User ||--o{ Activity : acts
  User ||--o{ AuditLog : acts

  Organisation {
    uuid id PK
    string name
    string slug UK
    enum type
    enum status
    enum verification_status
  }

  TrustProfile {
    uuid id PK
    uuid organisation_id UK
    int trust_score
    json score_breakdown
  }

  Document {
    uuid id PK
    uuid organisation_id FK
    enum type
    string storage_path
  }

  VerificationCase {
    uuid id PK
    uuid organisation_id FK
    enum status
  }

  RegistryProfile {
    uuid id PK
    uuid organisation_id UK
    string_array commodities
  }

  KycProfile {
    uuid id PK
    uuid user_id FK
    enum status
  }

  ComplianceCertificate {
    uuid id PK
    string reference UK
    uuid organisation_id FK
    enum type
    enum status
    datetime expires_at
  }

  ComplianceApproval {
    uuid id PK
    uuid certificate_id FK
    enum status
  }
```
