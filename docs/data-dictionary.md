# Boconic — Data Dictionary & Privacy Classification

**Version:** 2.0  
**Date:** 01/10/2026

## 1. Identity & RBAC Tables

### `users`
| Column | Type | Nullable | Constraints / Default | Description | Privacy Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | Primary Key | Unique user identifier | Internal |
| `telegram_user_id`| BIGINT | Yes | Unique | Numeric Telegram ID | Confidential (PII) |
| `telegram_username`| VARCHAR(64) | Yes | None | Telegram username (for display only) | Internal (PII) |
| `display_name` | VARCHAR(128) | No | None | Display name | Public |
| `public_alias` | VARCHAR(32) | No | Unique | E.g. "User #A81F" | Public |
| `language_code`| VARCHAR(8) | No | Default: 'vi' | Language code ('vi', 'en') | Internal |
| `status` | VARCHAR(32) | No | Default: 'active' | active, suspended, banned, deleted | Internal |
| `custom_data` | JSONB | No | Default: '{}' | Dynamic custom field values | Variable |
| `created_at` | TIMESTAMPTZ | No | Default: now() | Registration timestamp | Internal |
| `updated_at` | TIMESTAMPTZ | No | Default: now() | Last update timestamp | Internal |

### `user_locations`
| Column | Type | Nullable | Constraints / Default | Description | Privacy Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | Primary Key | Unique location record | Internal |
| `user_id` | UUID | No | FK -> users.id | Associated user | Internal |
| `country` | VARCHAR(64) | No | Default: 'Vietnam' | Country | Public |
| `city` | VARCHAR(128) | No | None | City / Province | Public |
| `district` | VARCHAR(128) | Yes | None | District / County | Public |
| `neighborhood` | VARCHAR(128) | Yes | None | Ward / Neighborhood | Public |
| `latitude` | NUMERIC(9,6)| Yes | None | GPS Latitude (optional) | Confidential (PII) |
| `longitude` | NUMERIC(9,6)| Yes | None | GPS Longitude (optional) | Confidential (PII) |
| `precision_level`| VARCHAR(32)| No | Default: 'coarse' | coarse, precise | Internal |
| `consent_at` | TIMESTAMPTZ | Yes | None | Consent timestamp | Internal |
| `updated_at` | TIMESTAMPTZ | No | Default: now() | Update timestamp | Internal |

### `admin_accounts`
| Column | Type | Nullable | Constraints / Default | Description | Privacy Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | Primary Key | Admin identifier | Internal |
| `username` | VARCHAR(64) | No | Unique | Admin username | Internal |
| `email` | VARCHAR(255)| Yes | Unique | Optional admin contact | Confidential (PII) |
| `password_hash`| VARCHAR(255)| No | None | Hashed password | Restricted |
| `telegram_user_id`| BIGINT | Yes | Unique | Verified linked Telegram ID | Confidential (PII) |
| `is_active` | BOOLEAN | No | Default: True | Account status | Internal |
| `created_at` | TIMESTAMPTZ | No | Default: now() | Creation timestamp | Internal |

### `roles` & `permissions`
- `roles`: `id` (UUID), `name` (VARCHAR), `description` (TEXT), `is_system` (BOOLEAN).
- `permissions`: `id` (UUID), `code` (VARCHAR, e.g. `books.write`), `description` (TEXT).
- `role_permissions`: `role_id` (FK), `permission_id` (FK).
- `admin_role_assignments`: `admin_id` (FK), `role_id` (FK).

---

## 2. Catalog & Organization Tables

### `books` (Specific Published Edition)
| Column | Type | Nullable | Constraints / Default | Description | Privacy Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | Primary Key | Book edition ID | Public |
| `title` | VARCHAR(255) | No | None | Book title | Public |
| `subtitle` | VARCHAR(255) | Yes | None | Subtitle | Public |
| `publisher` | VARCHAR(255) | Yes | None | Publisher name | Public |
| `publication_year`| INT | Yes | None | Year of publication | Public |
| `edition_label`| VARCHAR(64) | Yes | None | Edition (e.g. 'Tái bản lần 2') | Public |
| `language` | VARCHAR(32) | No | Default: 'vi' | Language | Public |
| `subject` | VARCHAR(64) | Yes | None | Subject (Toán, Vật lý, v.v.)| Public |
| `grade_level` | INT | Yes | CHECK (1..12) | School grade (1 to 12) | Public |
| `curriculum` | VARCHAR(64) | Yes | None | Curriculum name | Public |
| `isbn10` | VARCHAR(16) | Yes | None | Validated ISBN-10 | Public |
| `isbn13` | VARCHAR(32) | Yes | Unique | Normalized canonical ISBN-13 | Public |
| `description` | TEXT | Yes | None | Description | Public |
| `cover_media_id`| UUID | Yes | None | Cover image media ID | Public |
| `custom_data` | JSONB | No | Default: '{}' | Dynamic custom fields | Public |
| `verification_status`| VARCHAR(32)| No | Default: 'unverified' | unverified, verified | Public |
| `created_at` | TIMESTAMPTZ | No | Default: now() | Created timestamp | Internal |

### `book_copies` (Physical Item)
| Column | Type | Nullable | Constraints / Default | Description | Privacy Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | Primary Key | Physical copy ID | Public |
| `book_id` | UUID | No | FK -> books.id | Associated Book edition | Public |
| `owner_id` | UUID | No | FK -> users.id | Legal owner party | Internal |
| `current_holder_id`| UUID| No | FK -> users.id | Current physical custodian | Internal |
| `public_code` | VARCHAR(32) | No | Unique | E.g. 'BOC-9A4F2' | Public |
| `condition` | VARCHAR(32) | No | Default: 'good' | new, like_new, good, fair, poor | Public |
| `circulation_status`| VARCHAR(32)| No | Default: 'available'| available, reserved, loaned, maintenance, lost | Public |
| `maximum_loan_days`| INT | No | Default: 14 | Max borrowing duration | Public |
| `lending_policy`| VARCHAR(64)| No | Default: 'free_return'| Lending terms | Public |
| `storage_location_private`| TEXT| Yes| None | Private storage note for owner | Restricted |
| `notes` | TEXT | Yes | None | Condition or notes | Public |
| `custom_data` | JSONB | No | Default: '{}' | Dynamic custom fields | Public |

### `chapters`
- `id` (UUID), `book_id` (FK -> books.id), `chapter_number` (INT), `title` (VARCHAR), `page_start` (INT), `page_end` (INT), `topics` (JSONB array), `source` (VARCHAR).
- Constraint: `page_start <= page_end`.

---

## 3. Lending & Handshake Tables

### `borrow_requests`
| Column | Type | Nullable | Constraints / Default | Description | Privacy Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | Primary Key | Request identifier | Internal |
| `copy_id` | UUID | No | FK -> book_copies.id| Requested copy | Internal |
| `borrower_id`| UUID | No | FK -> users.id | Requesting user | Internal |
| `duration_days`| INT | No | Default: 14 | Proposed borrowing duration | Internal |
| `note` | TEXT | Yes | None | Message to owner | Internal |
| `status` | VARCHAR(32) | No | Default: 'pending' | pending, accepted, rejected, cancelled, expired | Internal |
| `created_at` | TIMESTAMPTZ | No | Default: now() | Created timestamp | Internal |

### `loans`
| Column | Type | Nullable | Constraints / Default | Description | Privacy Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | Primary Key | Loan record identifier | Internal |
| `request_id` | UUID | No | FK -> borrow_requests| Source request | Internal |
| `copy_id` | UUID | No | FK -> book_copies.id| Circulating copy | Internal |
| `borrower_id`| UUID | No | FK -> users.id | Borrower user | Internal |
| `lender_id` | UUID | No | FK -> users.id | Owner / Custodian | Internal |
| `status` | VARCHAR(32) | No | Default: 'reserved' | reserved, active, return_pending, returned, cancelled, expired, disputed, closed_lost | Internal |
| `reservation_expires_at`| TIMESTAMPTZ| Yes| None | Reservation expiration | Internal |
| `handed_over_at`| TIMESTAMPTZ| Yes| None | Physical handover timestamp | Internal |
| `due_at` | TIMESTAMPTZ | Yes | None | Expected return timestamp | Internal |
| `returned_at`| TIMESTAMPTZ | Yes | None | Physical return timestamp | Internal |
| `custom_data`| JSONB | No | Default: '{}' | Custom fields | Internal |

### `handover_confirmations`
- `id` (UUID), `loan_id` (FK), `actor_id` (FK -> users.id), `role` (`lender` / `borrower`), `action` (`handover` / `return`), `confirmed_at` (TIMESTAMPTZ).
- Unique `(loan_id, role, action)`.
