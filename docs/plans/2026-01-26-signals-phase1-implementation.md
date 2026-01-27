# Signals Phase 1: Core Infrastructure - Implementation Plan

**Branch**: `feature/signals-phase1`
**Worktree**: `../SightSignal-signals-phase1`
**Goal**: Reputation system and expanded taxonomy foundation

---

## Overview

Phase 1 establishes the foundation for the signals system by implementing:
1. User reputation tracking and scoring
2. Expanded 3-level taxonomy (categories → subcategories → types + tags)
3. Sighting reactions (upvote, downvote, confirmed, disputed, spam)
4. Sighting scoring and ranking algorithm
5. Seeding 15 core categories with full taxonomy

---

## Step-by-Step Implementation

### Step 1: Database Schema - Reputation System

**Files to create/modify:**
- `db/migrations/001_add_reputation_tables.sql`

**Tasks:**

1.1. Create user reputation table
```sql
CREATE TABLE user_reputation (
  user_id VARCHAR PRIMARY KEY,
  score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

1.2. Create reputation events audit log
```sql
CREATE TABLE reputation_events (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  amount INT NOT NULL,
  reason VARCHAR(50) NOT NULL,
  reference_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reputation_events_user ON reputation_events(user_id);
CREATE INDEX idx_reputation_events_created ON reputation_events(created_at DESC);
```

1.3. Run migration
```bash
# Apply to PostgreSQL (if using)
# Or create migration script for other DBs
```

---

### Step 2: Database Schema - Taxonomy Expansion

**Files to create/modify:**
- `db/migrations/002_expand_taxonomy.sql`

**Tasks:**

2.1. Create subcategories table
```sql
CREATE TABLE subcategories (
  id VARCHAR PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  category_id VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subcategories_category ON subcategories(category_id);
```

2.2. Update categories table
```sql
ALTER TABLE categories
  ADD COLUMN icon VARCHAR(50),
  ADD COLUMN description TEXT;
```

2.3. Update sighting_types table
```sql
ALTER TABLE sighting_types
  ADD COLUMN subcategory_id VARCHAR REFERENCES subcategories(id),
  ADD COLUMN tags TEXT[],
  ADD COLUMN icon VARCHAR(50);
```

---

### Step 3: Database Schema - Sighting Reactions

**Files to create/modify:**
- `db/migrations/003_add_sighting_reactions.sql`

**Tasks:**

3.1. Create sighting reactions table
```sql
CREATE TABLE sighting_reactions (
  sighting_id VARCHAR REFERENCES sightings(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (sighting_id, user_id, type)
);

CREATE INDEX idx_sighting_reactions_sighting ON sighting_reactions(sighting_id);
CREATE INDEX idx_sighting_reactions_user ON sighting_reactions(user_id);
CREATE INDEX idx_sighting_reactions_type ON sighting_reactions(type);
```

3.2. Add scoring columns to sightings table
```sql
ALTER TABLE sightings
  ADD COLUMN upvotes INT DEFAULT 0,
  ADD COLUMN downvotes INT DEFAULT 0,
  ADD COLUMN confirmations INT DEFAULT 0,
  ADD COLUMN disputes INT DEFAULT 0,
  ADD COLUMN spam_reports INT DEFAULT 0,
  ADD COLUMN score INT DEFAULT 0,
  ADD COLUMN hot_score FLOAT DEFAULT 0;

CREATE INDEX idx_sightings_hot_score ON sightings(hot_score DESC);
CREATE INDEX idx_sightings_score ON sightings(score DESC);
```

---

### Step 4: Domain Layer - Reputation

**Files to create:**
- `src/domain/reputation/reputation.ts`
- `src/domain/reputation/reputation-events.ts`

**Tasks:**

4.1. Create reputation types
```typescript
export type UserId = string & { readonly __brand: "UserId" };
export type ReputationEventId = string & { readonly __brand: "ReputationEventId" };

export type ReputationReason =
  | "sighting_created"
  | "sighting_upvoted"
  | "sighting_confirmed"
  | "sighting_disputed"
  | "signal_created"
  | "signal_subscribed"
  | "signal_verified"
  | "report_upheld";

export type UserReputation = {
  userId: UserId;
  score: number;
  createdAt: string;
  updatedAt: string;
};

export type ReputationEvent = {
  id: ReputationEventId;
  userId: UserId;
  amount: number;
  reason: ReputationReason;
  referenceId?: string;
  createdAt: string;
};
```

4.2. Create reputation scoring constants
```typescript
export const REPUTATION_AMOUNTS: Record<ReputationReason, number> = {
  sighting_created: 1,
  sighting_upvoted: 1,
  sighting_confirmed: 2,
  sighting_disputed: -1,
  signal_created: 5,
  signal_subscribed: 2,
  signal_verified: 50,
  report_upheld: -10,
};
```

4.3. Create reputation tier calculation
```typescript
export type ReputationTier = "unverified" | "new" | "trusted" | "verified";

export const getReputationTier = (
  score: number,
  isVerified: boolean = false
): ReputationTier => {
  if (isVerified) return "verified";
  if (score >= 50) return "trusted";
  if (score >= 10) return "new";
  return "unverified";
};
```

---

### Step 5: Domain Layer - Taxonomy Expansion

**Files to create/modify:**
- `src/domain/taxonomy/taxonomy.ts` (new)
- `src/data/taxonomy.ts` (modify - will expand later)

**Tasks:**

5.1. Create taxonomy domain types
```typescript
export type CategoryId = string & { readonly __brand: "CategoryId" };
export type SubcategoryId = string & { readonly __brand: "SubcategoryId" };
export type SightingTypeId = string & { readonly __brand: "SightingTypeId" };

export type Category = {
  id: CategoryId;
  label: string;
  icon?: string;
  description: string;
};

export type Subcategory = {
  id: SubcategoryId;
  label: string;
  categoryId: CategoryId;
  description?: string;
};

export type SightingType = {
  id: SightingTypeId;
  label: string;
  categoryId: CategoryId;
  subcategoryId?: SubcategoryId;
  tags: string[];
  icon?: string;
};
```

5.2. Create taxonomy validation
```typescript
export const validateCategoryId = (id: string): Result<CategoryId, DomainError> => {
  if (!id || id.trim().length === 0) {
    return err({
      code: "taxonomy.invalid_category_id",
      message: "Category ID is required",
    });
  }
  return ok(id as CategoryId);
};

// Similar for subcategory and type
```

---

### Step 6: Domain Layer - Sighting Reactions

**Files to create:**
- `src/domain/sightings/sighting-reaction.ts`

**Tasks:**

6.1. Create reaction types
```typescript
export type SightingReactionId = string & { readonly __brand: "SightingReactionId" };

export type SightingReactionType =
  | "upvote"
  | "downvote"
  | "confirmed"
  | "disputed"
  | "spam";

export type SightingReaction = {
  sightingId: SightingId;
  userId: UserId;
  type: SightingReactionType;
  createdAt: string;
};

export type SightingReactionCounts = {
  upvotes: number;
  downvotes: number;
  confirmations: number;
  disputes: number;
  spamReports: number;
};
```

6.2. Create scoring functions
```typescript
export const calculateBaseScore = (counts: SightingReactionCounts): number => {
  return (
    counts.upvotes -
    counts.downvotes +
    counts.confirmations * 2 -
    counts.disputes * 2 -
    counts.spamReports * 5
  );
};

export const calculateHotScore = (baseScore: number, ageInHours: number): number => {
  return baseScore / Math.pow(ageInHours + 2, 1.5);
};
```

6.3. Update Sighting type to include scores
```typescript
// In src/domain/sightings/sighting.ts
export type Sighting = {
  // ... existing fields
  upvotes: number;
  downvotes: number;
  confirmations: number;
  disputes: number;
  spamReports: number;
  score: number;
  hotScore: number;
};
```

---

### Step 7: Ports Layer - Repository Interfaces

**Files to create/modify:**
- `src/ports/reputation-repository.ts` (new)
- `src/ports/taxonomy-repository.ts` (new)
- `src/ports/sighting-reaction-repository.ts` (new)

**Tasks:**

7.1. Create reputation repository interface
```typescript
export type ReputationRepository = {
  getByUserId: (userId: UserId) => Promise<UserReputation | null>;
  create: (reputation: UserReputation) => Promise<void>;
  update: (reputation: UserReputation) => Promise<void>;
  addEvent: (event: ReputationEvent) => Promise<void>;
  getEvents: (userId: UserId, limit?: number) => Promise<ReputationEvent[]>;
};
```

7.2. Create taxonomy repository interface
```typescript
export type TaxonomyRepository = {
  // Categories
  getCategories: () => Promise<Category[]>;
  getCategoryById: (id: CategoryId) => Promise<Category | null>;

  // Subcategories
  getSubcategories: (categoryId?: CategoryId) => Promise<Subcategory[]>;
  getSubcategoryById: (id: SubcategoryId) => Promise<Subcategory | null>;

  // Types
  getTypes: (filters?: {
    categoryId?: CategoryId;
    subcategoryId?: SubcategoryId;
    tags?: string[];
  }) => Promise<SightingType[]>;
  getTypeById: (id: SightingTypeId) => Promise<SightingType | null>;

  // Tags
  getAllTags: () => Promise<string[]>;
};
```

7.3. Create sighting reaction repository interface
```typescript
export type SightingReactionRepository = {
  add: (reaction: SightingReaction) => Promise<void>;
  remove: (sightingId: SightingId, userId: UserId, type: SightingReactionType) => Promise<void>;
  getUserReaction: (
    sightingId: SightingId,
    userId: UserId
  ) => Promise<SightingReaction | null>;
  getCounts: (sightingId: SightingId) => Promise<SightingReactionCounts>;
  getReactionsForSighting: (sightingId: SightingId) => Promise<SightingReaction[]>;
};
```

---

### Step 8: Application Layer - Use Cases

**Files to create:**
- `src/application/use-cases/reputation/add-reputation-event.ts`
- `src/application/use-cases/reputation/get-user-reputation.ts`
- `src/application/use-cases/sightings/add-sighting-reaction.ts`
- `src/application/use-cases/sightings/remove-sighting-reaction.ts`
- `src/application/use-cases/sightings/get-sighting-reactions.ts`
- `src/application/use-cases/taxonomy/get-taxonomy.ts`

**Tasks:**

8.1. Create add reputation event use case
```typescript
export type AddReputationEvent = (
  userId: string,
  reason: ReputationReason,
  referenceId?: string
) => Promise<Result<UserReputation, DomainError>>;

export const buildAddReputationEvent = ({
  repository,
}: {
  repository: ReputationRepository;
}): AddReputationEvent => {
  return async (userId, reason, referenceId) => {
    // Get or create user reputation
    let reputation = await repository.getByUserId(userId as UserId);

    if (!reputation) {
      reputation = {
        userId: userId as UserId,
        score: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await repository.create(reputation);
    }

    // Add event
    const amount = REPUTATION_AMOUNTS[reason];
    const event: ReputationEvent = {
      id: crypto.randomUUID() as ReputationEventId,
      userId: userId as UserId,
      amount,
      reason,
      referenceId,
      createdAt: new Date().toISOString(),
    };

    await repository.addEvent(event);

    // Update score (never below 0)
    reputation.score = Math.max(0, reputation.score + amount);
    reputation.updatedAt = new Date().toISOString();
    await repository.update(reputation);

    return ok(reputation);
  };
};
```

8.2. Create add sighting reaction use case
```typescript
export type AddSightingReaction = (
  sightingId: string,
  userId: string,
  type: SightingReactionType
) => Promise<Result<void, DomainError>>;

export const buildAddSightingReaction = ({
  sightingRepository,
  reactionRepository,
  reputationRepository,
}: {
  sightingRepository: SightingRepository;
  reactionRepository: SightingReactionRepository;
  reputationRepository: ReputationRepository;
}): AddSightingReaction => {
  return async (sightingId, userId, type) => {
    // Get sighting
    const sighting = await sightingRepository.getById(sightingId as SightingId);
    if (!sighting) {
      return err({
        code: "sighting.not_found",
        message: "Sighting not found",
      });
    }

    // Can't react to own sighting
    if (sighting.reporterId === userId) {
      return err({
        code: "sighting.cannot_react_to_own",
        message: "Cannot react to your own sighting",
      });
    }

    // Add reaction
    const reaction: SightingReaction = {
      sightingId: sightingId as SightingId,
      userId: userId as UserId,
      type,
      createdAt: new Date().toISOString(),
    };

    await reactionRepository.add(reaction);

    // Recalculate scores
    const counts = await reactionRepository.getCounts(sightingId as SightingId);
    const baseScore = calculateBaseScore(counts);
    const ageInHours = (Date.now() - Date.parse(sighting.createdAt)) / (1000 * 60 * 60);
    const hotScore = calculateHotScore(baseScore, ageInHours);

    // Update sighting
    const updatedSighting = {
      ...sighting,
      upvotes: counts.upvotes,
      downvotes: counts.downvotes,
      confirmations: counts.confirmations,
      disputes: counts.disputes,
      spamReports: counts.spamReports,
      score: baseScore,
      hotScore,
    };

    await sightingRepository.update(updatedSighting);

    // Update sighting creator's reputation (if applicable)
    if (sighting.reporterId && type === "upvote") {
      await buildAddReputationEvent({ repository: reputationRepository })(
        sighting.reporterId,
        "sighting_upvoted",
        sightingId
      );
    } else if (sighting.reporterId && type === "confirmed") {
      await buildAddReputationEvent({ repository: reputationRepository })(
        sighting.reporterId,
        "sighting_confirmed",
        sightingId
      );
    } else if (sighting.reporterId && type === "disputed") {
      await buildAddReputationEvent({ repository: reputationRepository })(
        sighting.reporterId,
        "sighting_disputed",
        sightingId
      );
    }

    return ok(undefined);
  };
};
```

8.3. Create get taxonomy use case
```typescript
export type GetTaxonomy = () => Promise<{
  categories: Category[];
  subcategories: Subcategory[];
  types: SightingType[];
  tags: string[];
}>;

export const buildGetTaxonomy = ({
  repository,
}: {
  repository: TaxonomyRepository;
}): GetTaxonomy => {
  return async () => {
    const [categories, subcategories, types, tags] = await Promise.all([
      repository.getCategories(),
      repository.getSubcategories(),
      repository.getTypes(),
      repository.getAllTags(),
    ]);

    return { categories, subcategories, types, tags };
  };
};
```

---

### Step 9: Adapters Layer - Repository Implementations

**Files to create:**
- `src/adapters/repositories/in-memory-reputation-repository.ts`
- `src/adapters/repositories/in-memory-taxonomy-repository.ts`
- `src/adapters/repositories/in-memory-sighting-reaction-repository.ts`
- `src/adapters/repositories/postgres/postgres-reputation-repository.ts`
- `src/adapters/repositories/postgres/postgres-taxonomy-repository.ts`
- `src/adapters/repositories/postgres/postgres-sighting-reaction-repository.ts`

**Tasks:**

9.1. Implement in-memory reputation repository
```typescript
export const inMemoryReputationRepository = (): ReputationRepository => {
  const reputations = new Map<UserId, UserReputation>();
  const events = new Map<UserId, ReputationEvent[]>();

  return {
    async getByUserId(userId) {
      return reputations.get(userId) || null;
    },
    async create(reputation) {
      reputations.set(reputation.userId, reputation);
    },
    async update(reputation) {
      reputations.set(reputation.userId, reputation);
    },
    async addEvent(event) {
      const userEvents = events.get(event.userId) || [];
      userEvents.push(event);
      events.set(event.userId, userEvents);
    },
    async getEvents(userId, limit = 50) {
      const userEvents = events.get(userId) || [];
      return userEvents.slice(-limit);
    },
  };
};
```

9.2. Implement in-memory sighting reaction repository
```typescript
export const inMemorySightingReactionRepository = (): SightingReactionRepository => {
  const reactions = new Map<string, SightingReaction>();

  const makeKey = (sightingId: SightingId, userId: UserId, type: SightingReactionType) =>
    `${sightingId}:${userId}:${type}`;

  return {
    async add(reaction) {
      const key = makeKey(reaction.sightingId, reaction.userId, reaction.type);
      reactions.set(key, reaction);
    },
    async remove(sightingId, userId, type) {
      const key = makeKey(sightingId, userId, type);
      reactions.delete(key);
    },
    async getUserReaction(sightingId, userId) {
      for (const reaction of reactions.values()) {
        if (reaction.sightingId === sightingId && reaction.userId === userId) {
          return reaction;
        }
      }
      return null;
    },
    async getCounts(sightingId) {
      let upvotes = 0, downvotes = 0, confirmations = 0, disputes = 0, spamReports = 0;

      for (const reaction of reactions.values()) {
        if (reaction.sightingId === sightingId) {
          switch (reaction.type) {
            case "upvote": upvotes++; break;
            case "downvote": downvotes++; break;
            case "confirmed": confirmations++; break;
            case "disputed": disputes++; break;
            case "spam": spamReports++; break;
          }
        }
      }

      return { upvotes, downvotes, confirmations, disputes, spamReports };
    },
    async getReactionsForSighting(sightingId) {
      return Array.from(reactions.values()).filter(r => r.sightingId === sightingId);
    },
  };
};
```

9.3. Implement PostgreSQL repositories (similar pattern)

---

### Step 10: Seed Initial Taxonomy

**Files to create:**
- `src/data/taxonomy-seed.ts`

**Tasks:**

10.1. Create 15 core categories with descriptions and icons
```typescript
export const INITIAL_CATEGORIES: Category[] = [
  {
    id: "cat-community-events" as CategoryId,
    label: "Community Events",
    icon: "🎉",
    description: "Local events, festivals, and gatherings",
  },
  {
    id: "cat-public-safety" as CategoryId,
    label: "Public Safety",
    icon: "🚨",
    description: "Emergency response and safety alerts",
  },
  // ... 13 more
];
```

10.2. Create subcategories for each category (50-80 total)
```typescript
export const INITIAL_SUBCATEGORIES: Subcategory[] = [
  {
    id: "subcat-sales-markets" as SubcategoryId,
    label: "Sales & Markets",
    categoryId: "cat-community-events" as CategoryId,
  },
  {
    id: "subcat-festivals" as SubcategoryId,
    label: "Festivals",
    categoryId: "cat-community-events" as CategoryId,
  },
  // ... more
];
```

10.3. Create sighting types with tags (100-150 total)
```typescript
export const INITIAL_TYPES: SightingType[] = [
  {
    id: "type-garage-sale" as SightingTypeId,
    label: "Garage Sale",
    categoryId: "cat-community-events" as CategoryId,
    subcategoryId: "subcat-sales-markets" as SubcategoryId,
    tags: ["shopping", "neighborhood", "weekend"],
    icon: "🏷️",
  },
  // ... more
];
```

10.4. Create seed script
```typescript
export const seedTaxonomy = async (repository: TaxonomyRepository) => {
  // Seed categories
  for (const category of INITIAL_CATEGORIES) {
    await repository.createCategory(category);
  }

  // Seed subcategories
  for (const subcategory of INITIAL_SUBCATEGORIES) {
    await repository.createSubcategory(subcategory);
  }

  // Seed types
  for (const type of INITIAL_TYPES) {
    await repository.createType(type);
  }
};
```

---

### Step 11: API Endpoints - Reactions

**Files to create:**
- `src/app/api/sightings/[id]/react/route.ts`
- `src/app/api/sightings/[id]/reactions/route.ts`

**Tasks:**

11.1. Create POST /api/sightings/[id]/react endpoint
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { type } = body; // upvote, downvote, confirmed, disputed, spam
  const userId = getUserIdFromSession(request); // TODO: implement auth

  const result = await addSightingReaction(params.id, userId, type);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
```

11.2. Create DELETE /api/sightings/[id]/react endpoint
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const userId = getUserIdFromSession(request);

  await removeSightingReaction(params.id, userId, type);
  return NextResponse.json({ success: true });
}
```

11.3. Create GET /api/sightings/[id]/reactions endpoint
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reactions = await getSightingReactions(params.id);
  return NextResponse.json({ data: reactions });
}
```

---

### Step 12: API Endpoints - Reputation

**Files to create:**
- `src/app/api/users/[id]/reputation/route.ts`
- `src/app/api/users/me/reputation/route.ts`

**Tasks:**

12.1. Create GET /api/users/[id]/reputation
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reputation = await getUserReputation(params.id);
  const events = await getReputationEvents(params.id, 20);

  if (!reputation) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      reputation,
      events,
      tier: getReputationTier(reputation.score),
    },
  });
}
```

---

### Step 13: API Endpoints - Taxonomy

**Files to create:**
- `src/app/api/taxonomy/route.ts`
- `src/app/api/taxonomy/categories/route.ts`
- `src/app/api/taxonomy/subcategories/route.ts`
- `src/app/api/taxonomy/types/route.ts`
- `src/app/api/taxonomy/tags/route.ts`

**Tasks:**

13.1. Create GET /api/taxonomy endpoint (all at once)
```typescript
export async function GET() {
  const taxonomy = await getTaxonomy();
  return NextResponse.json({ data: taxonomy });
}
```

13.2. Create filtered endpoints for each level
```typescript
// GET /api/taxonomy/subcategories?categoryId=X
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");

  const subcategories = await getSubcategories(categoryId);
  return NextResponse.json({ data: subcategories });
}
```

---

### Step 14: UI Components - Reaction Buttons

**Files to create:**
- `src/components/sightings/ReactionButtons.tsx`
- `src/components/sightings/ReactionCounts.tsx`

**Tasks:**

14.1. Create reaction button component
```typescript
export function ReactionButtons({ sightingId, userId }: Props) {
  const [reactions, setReactions] = useState<SightingReactionCounts>();
  const [userReaction, setUserReaction] = useState<SightingReactionType | null>();

  const handleReact = async (type: SightingReactionType) => {
    if (userReaction === type) {
      // Remove reaction
      await fetch(`/api/sightings/${sightingId}/react?type=${type}`, {
        method: "DELETE",
      });
      setUserReaction(null);
    } else {
      // Add reaction
      await fetch(`/api/sightings/${sightingId}/react`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      setUserReaction(type);
    }

    // Refresh counts
    fetchReactions();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleReact("upvote")}
        className={userReaction === "upvote" ? "active" : ""}
      >
        ⬆️ {reactions?.upvotes || 0}
      </button>
      <button
        onClick={() => handleReact("downvote")}
        className={userReaction === "downvote" ? "active" : ""}
      >
        ⬇️ {reactions?.downvotes || 0}
      </button>
      <button
        onClick={() => handleReact("confirmed")}
        className={userReaction === "confirmed" ? "active" : ""}
      >
        ✓ Confirmed ({reactions?.confirmations || 0})
      </button>
    </div>
  );
}
```

---

### Step 15: UI Components - Reputation Badge

**Files to create:**
- `src/components/reputation/ReputationBadge.tsx`
- `src/components/reputation/ReputationTier.tsx`

**Tasks:**

15.1. Create reputation badge component
```typescript
export function ReputationBadge({ userId }: Props) {
  const [reputation, setReputation] = useState<UserReputation>();

  useEffect(() => {
    fetch(`/api/users/${userId}/reputation`)
      .then(res => res.json())
      .then(data => setReputation(data.reputation));
  }, [userId]);

  if (!reputation) return null;

  const tier = getReputationTier(reputation.score);

  return (
    <div className={`badge badge-${tier}`}>
      {tier === "verified" && "✓ Verified"}
      {tier === "trusted" && `★ ${reputation.score}`}
      {tier === "new" && `⭐ ${reputation.score}`}
      {tier === "unverified" && `${reputation.score}`}
    </div>
  );
}
```

---

### Step 16: Admin UI - Reputation Management

**Files to create:**
- `src/app/admin/reputation/page.tsx`

**Tasks:**

16.1. Create reputation leaderboard page
```typescript
export default function AdminReputation() {
  const [topUsers, setTopUsers] = useState<UserReputation[]>([]);

  return (
    <AdminLayout>
      <h2>User Reputation Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Score</th>
            <th>Tier</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {topUsers.map(user => (
            <tr key={user.userId}>
              <td>{user.userId}</td>
              <td>{user.score}</td>
              <td><ReputationTier score={user.score} /></td>
              <td>
                <button>View Events</button>
                <button>Adjust</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  );
}
```

---

### Step 17: Update Sighting Repository

**Files to modify:**
- All sighting repository implementations (in-memory, file, postgres)

**Tasks:**

17.1. Update repository to support new scoring columns
```typescript
// Add to update() and create() methods
upvotes: sighting.upvotes,
downvotes: sighting.downvotes,
confirmations: sighting.confirmations,
disputes: sighting.disputes,
spam_reports: sighting.spamReports,
score: sighting.score,
hot_score: sighting.hotScore,
```

17.2. Add sorting by hot_score to list() method
```typescript
// PostgreSQL example
export async function list(filters: SightingFilters) {
  const sortBy = filters.sortBy || "hot";

  let orderClause = "created_at DESC";
  if (sortBy === "hot") orderClause = "hot_score DESC";
  if (sortBy === "top") orderClause = "score DESC";

  // ... rest of query
}
```

---

### Step 18: Testing

**Files to create:**
- `tests/unit/reputation.test.ts`
- `tests/unit/sighting-reactions.test.ts`
- `tests/unit/taxonomy.test.ts`
- `tests/e2e/sighting-reactions.spec.ts`

**Tasks:**

18.1. Test reputation scoring
```typescript
describe("Reputation System", () => {
  it("should award points for sighting creation", async () => {
    const result = await addReputationEvent(userId, "sighting_created");
    expect(result.ok).toBe(true);
    expect(result.value.score).toBe(1);
  });

  it("should never go below 0", async () => {
    await addReputationEvent(userId, "report_upheld"); // -10
    const reputation = await getUserReputation(userId);
    expect(reputation.score).toBe(0);
  });
});
```

18.2. Test sighting reactions
```typescript
describe("Sighting Reactions", () => {
  it("should add upvote reaction", async () => {
    const result = await addSightingReaction(sightingId, userId, "upvote");
    expect(result.ok).toBe(true);

    const counts = await getSightingReactionCounts(sightingId);
    expect(counts.upvotes).toBe(1);
  });

  it("should prevent reacting to own sighting", async () => {
    const result = await addSightingReaction(sightingId, ownerId, "upvote");
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("sighting.cannot_react_to_own");
  });

  it("should recalculate hot score after reaction", async () => {
    await addSightingReaction(sightingId, userId, "upvote");
    const sighting = await getSighting(sightingId);
    expect(sighting.hotScore).toBeGreaterThan(0);
  });
});
```

18.3. Test taxonomy queries
```typescript
describe("Taxonomy", () => {
  it("should return all 15 categories", async () => {
    const categories = await getCategories();
    expect(categories).toHaveLength(15);
  });

  it("should filter subcategories by category", async () => {
    const subcategories = await getSubcategories("cat-community-events");
    expect(subcategories.every(s => s.categoryId === "cat-community-events")).toBe(true);
  });

  it("should filter types by tags", async () => {
    const types = await getTypes({ tags: ["dangerous"] });
    expect(types.every(t => t.tags.includes("dangerous"))).toBe(true);
  });
});
```

18.4. E2E test reaction flow
```typescript
test("user can react to sighting", async ({ page }) => {
  await page.goto("/sightings/test-id");

  // Click upvote
  await page.click('button:has-text("⬆️")');

  // Check count increased
  await expect(page.locator('button:has-text("⬆️")')).toContainText("1");

  // Check active state
  await expect(page.locator('button:has-text("⬆️")')).toHaveClass(/active/);
});
```

---

## Checklist

- [ ] Database migrations created and run
- [ ] Domain layer: Reputation types and logic
- [ ] Domain layer: Taxonomy types and validation
- [ ] Domain layer: Sighting reactions and scoring
- [ ] Ports: Repository interfaces defined
- [ ] Application: Use cases implemented
- [ ] Adapters: In-memory repositories
- [ ] Adapters: PostgreSQL repositories
- [ ] Data: Initial taxonomy seeded (15 categories, ~50 subcategories, ~100 types)
- [ ] API: Reaction endpoints
- [ ] API: Reputation endpoints
- [ ] API: Taxonomy endpoints
- [ ] UI: Reaction button components
- [ ] UI: Reputation badge components
- [ ] Admin: Reputation management page
- [ ] Tests: Unit tests passing
- [ ] Tests: E2E tests passing
- [ ] Documentation: API docs updated
- [ ] Ready for Phase 2

---

## Success Criteria

**Phase 1 Complete When:**

1. Users can upvote/downvote/confirm/dispute sightings
2. Sighting scores calculate correctly (base + hot)
3. User reputation tracks properly (events logged, score updated)
4. Taxonomy API returns 15 categories with full hierarchy
5. Reputation badges display on user profiles
6. Admin can view reputation leaderboard
7. All tests passing (unit + E2E)
8. Low-score sightings hide automatically (score < -5)

**Metrics:**
- API response time < 200ms for taxonomy queries
- Reaction updates feel instant (< 100ms perceived)
- Hot score calculation matches Reddit algorithm
- Zero reputation calculation bugs (audit log verifiable)

---

## Next Steps (Phase 2)

After Phase 1 completion, move to Phase 2:
- Signal domain model
- Signal matching engine
- Signal subscriptions
- Multi-channel notification architecture

Branch: `feature/signals-phase2`
