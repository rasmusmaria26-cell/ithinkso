/**
 * Case storage.
 *
 * Two implementations behind one interface:
 *  - MongoCaseStore: production. TTL index on expires_at (90 days).
 *  - MemoryCaseStore: tests and a keyless local run. Same semantics, no server.
 *
 * The pipeline only ever talks to this interface, so tests never need Mongo.
 */
import mongoose, { Schema } from "mongoose";
export const CASE_TTL_DAYS = 90;
// ---------------------------------------------------------------------------
// Mongo
// ---------------------------------------------------------------------------
const CaseSchema = new Schema({
    case_id: { type: String, required: true, unique: true, index: true },
    status: { type: String, required: true, enum: ["running", "done", "failed"] },
    stage: { type: String, default: null },
    idea: { type: String, required: true },
    idea_hash: { type: String, required: true, index: true },
    verdict: { type: String, default: null },
    // Mixed: the result is validated by zod before it is written, and storing it
    // as Mixed avoids a Mongoose schema that must be kept in sync with CaseResult.
    result: { type: Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    created_at: { type: Date, required: true },
    expires_at: { type: Date, required: true },
}, { versionKey: false });
// TTL: Mongo deletes the document once expires_at passes. 90 days.
CaseSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
const CaseModel = mongoose.models["CaseFile"] ??
    mongoose.model("CaseFile", CaseSchema);
export class MongoCaseStore {
    async create(record) {
        await CaseModel.create(record);
    }
    async update(case_id, patch) {
        await CaseModel.updateOne({ case_id }, { $set: patch });
    }
    async get(case_id) {
        const doc = await CaseModel.findOne({ case_id }).lean().exec();
        return doc ?? null;
    }
    async findFreshDone(ideaHash, freshAfter) {
        const doc = await CaseModel.findOne({
            idea_hash: ideaHash,
            status: "done",
            created_at: { $gte: freshAfter },
        })
            .sort({ created_at: -1 })
            .lean()
            .exec();
        return doc ?? null;
    }
}
// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------
export class MemoryCaseStore {
    docs = new Map();
    async create(record) {
        if (this.docs.has(record.case_id)) {
            throw new Error(`case_id collision: ${record.case_id}`);
        }
        this.docs.set(record.case_id, { ...record });
    }
    async update(case_id, patch) {
        const existing = this.docs.get(case_id);
        if (!existing)
            return;
        this.docs.set(case_id, { ...existing, ...patch });
    }
    async get(case_id) {
        const doc = this.docs.get(case_id);
        return doc ? { ...doc } : null;
    }
    async findFreshDone(ideaHash, freshAfter) {
        const candidates = [...this.docs.values()]
            .filter((d) => d.idea_hash === ideaHash && d.status === "done" && d.created_at.getTime() >= freshAfter.getTime())
            .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        const found = candidates[0];
        return found ? { ...found } : null;
    }
    /** Test seam. */
    clear() {
        this.docs.clear();
    }
    get size() {
        return this.docs.size;
    }
}
//# sourceMappingURL=store.js.map