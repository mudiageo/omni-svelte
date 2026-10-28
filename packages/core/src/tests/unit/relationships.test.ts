import { describe, it, expect } from 'vitest';
import { RelationshipLoader } from '../../database/relationships';
import { Model } from '../../database/model';
import { configureDatabase } from '../../database/database';

describe('RelationshipLoader', () => {
    it('should dynamically resolve string pivotTable to pgTable in manyToMany relationships', async () => {
        // Mock getDatabase() to avoid exceptions before the resolution logic
        // But since we catch the exception anyway, it's fine.
        
        class TagModel extends Model {
            static table = { id: { name: 'id' } } as any;
            static primaryKey = 'id';
        }

        class PostModel extends Model {
            static table = { id: { name: 'id' } } as any;
            static primaryKey = 'id';
            static relationships: any = {
                tags: {
                    type: 'manyToMany',
                    related: TagModel,
                    pivotTable: 'post_tag_pivot',
                    foreignPivotKey: 'post_id',
                    relatedPivotKey: 'tag_id',
                    localKey: 'id'
                }
            };
            
            attributes: any = { id: 1 };
            
            getAttribute(key: string) {
                return this.attributes[key];
            }
            setRelation() {}
        }
        
        const models = [new PostModel()];
        
        try {
            await RelationshipLoader.loadRelations(models, ['tags']);
        } catch (e: any) {
            // Ignore error from unmocked DB connection
        }
        
        // The pivotTable should have been modified in place to a Drizzle table object!
        expect(typeof PostModel.relationships.tags.pivotTable).not.toBe('string');
        expect(PostModel.relationships.tags.pivotTable).toBeDefined();
    });
});
