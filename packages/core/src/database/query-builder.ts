import { 
	eq, ne, gt, gte, lt, lte, like, ilike, inArray, isNull, isNotNull, 
	desc, asc, sql, and, or, exists, notExists, count, sum, avg, min, max,
	type SQL
} from 'drizzle-orm'
import { getDatabase } from './database.js'
import { RelationshipLoader } from './relationships.js'
import type { Model } from './model.js'
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core'

export class QueryBuilder<T extends typeof Model> {
  private modelClass: T
  private queryBuilder: any
  private relations: string[] = []
  private selectColumns: string[] = []
  private whereConditions: any[] = []
  private groupByColumns: any[] = []
  private havingConditions: any[] = []
  private joins: any[] = []

  constructor(modelClass: T) {
    this.modelClass = modelClass
    this.queryBuilder = getDatabase().select().from(modelClass.table)
  }

  // WHERE clauses
  where(column: string, operator?: any, value?: any) {
    if (arguments.length === 2) {
      value = operator
      operator = '='
    }

    const condition = this.buildCondition(column, operator, value)
    this.queryBuilder = this.queryBuilder.where(condition)
    return this
  }

json(column: string, path: string, operator?: string, value?: any) {
	const tableColumn = (this.modelClass.table as any)[column]
	const jsonPath = sql`${tableColumn}->>${path}`
	
	if (operator && value !== undefined) {
		const condition = this.buildCondition(jsonPath as any, operator, value)
		this.queryBuilder = this.queryBuilder.where(condition)
	}
	
	return this
}

	jsonContains(column: string, value: any) {
		const tableColumn = (this.modelClass.table as any)[column]
		this.queryBuilder = this.queryBuilder.where(sql`${tableColumn} @> ${JSON.stringify(value)}`)
		return this
	}

	jsonLength(column: string, operator: string, value: number) {
		const tableColumn = (this.modelClass.table as any)[column]
		const condition = this.buildCondition(
			sql`json_array_length(${tableColumn})` as any, 
			operator, 
			value
		)
		this.queryBuilder = this.queryBuilder.where(condition)
		return this
	}

  whereExists(callback: (query: QueryBuilder<any>) => QueryBuilder<any>) {
		const subquery = callback(new QueryBuilder(this.modelClass))
		this.queryBuilder = this.queryBuilder.where(exists(subquery.queryBuilder))
		return this
	}

	whereNotExists(callback: (query: QueryBuilder<any>) => QueryBuilder<any>) {
		const subquery = callback(new QueryBuilder(this.modelClass))
		this.queryBuilder = this.queryBuilder.where(notExists(subquery.queryBuilder))
		return this
	}

	whereIn(column: string, values: any[] | QueryBuilder<any>) {
		const tableColumn = (this.modelClass.table as any)[column]
		
		if (values instanceof QueryBuilder) {
			this.queryBuilder = this.queryBuilder.where(inArray(tableColumn, values.queryBuilder))
		} else {
			this.queryBuilder = this.queryBuilder.where(inArray(tableColumn, values))
		}
		return this
	}

  /**
   * Add OR conditions to the query. This method supports multiple formats for maximum flexibility.
   * 
   * **Recommended approach: Object format** - Most readable and maintainable
   * 
   * @example
   * // Object format (RECOMMENDED) - simple equality checks
   * query.whereAny({ status: 'active', priority: 'high' })
   * 
   * // Object format with operators (value as [operator, value])
   * query.whereAny({ 
   *   age: ['>', 18], 
   *   status: ['=', 'active'],
   *   name: ['like', '%john%']
   * })
   * 
   * // Array format - [column, value] or [column, operator, value]
   * query.whereAny([
   *   ['status', 'active'],
   *   ['priority', '>', 5],
   *   ['name', 'like', '%admin%']
   * ])
   * 
   * // Callback format - for complex conditions
   * query.whereAny((q) => {
   *   q.where('status', 'active')
   *    .where('priority', '>', 5)
   *    .where('created_at', '>', new Date())
   * })
   * 
   * @param conditions - Object with column-value pairs, array of conditions, or callback function
   * @returns Query builder instance for chaining
   */
whereAny(
	conditions: 
		| Record<string, any> 
		| Array<[string, any] | [string, string, any]> 
		| ((builder: this) => void)
): this {
	let orConditions: any[] = []
    
    if (typeof conditions === 'function') {
      // Callback approach - collect conditions
      const originalWhere = this.where.bind(this)
      const collectedConditions: any[] = []
      
      // Temporarily override where to collect conditions
      this.where = (column: string, operator?: any, value?: any) => {
        if (arguments.length === 2) {
          value = operator
          operator = '='
        }
        collectedConditions.push(this.buildCondition(column, operator, value))
        return this
      }
      
      conditions(this)
      
      // Restore original where method
      this.where = originalWhere
      orConditions = collectedConditions
      
    } else if (Array.isArray(conditions)) {
      // Array format
      orConditions = conditions.map(condition => {
        if (condition.length === 2) {
          return this.buildCondition(condition[0], '=', condition[1])
        } else {
          return this.buildCondition(condition[0], condition[1], condition[2])
        }
      })
      
    } else {
      // Object format
      orConditions = Object.entries(conditions).map(([column, value]) => {
        if (Array.isArray(value)) {
          return this.buildCondition(column, value[0], value[1])
        } else {
          return this.buildCondition(column, '=', value)
        }
      })
    }
    
    this.queryBuilder = this.queryBuilder.where(or(...orConditions))
    return this
  }

  /**
   * Search across multiple columns using LIKE or ILIKE operators.
   * 
   * @example
   * // Basic search across multiple columns (case-insensitive by default)
   * query.search('john', ['name', 'email', 'description'])
   * 
   * // Case-sensitive search
   * query.search('John', ['name', 'email'], { caseSensitive: true })
   * 
   * // Custom wildcards (default wraps with %)
   * query.search('john@', ['email'], { wildcards: false })
   * 
   * // Search with exact match on some columns
   * query.search('admin', ['role'], { exact: true })
   * 
   * @param term - The search term
   * @param columns - Array of column names to search in
   * @param options - Search configuration options
   * @returns Query builder instance for chaining
   */
  search(
    term: string, 
    columns: string[], 
    options: {
      caseSensitive?: boolean
      wildcards?: boolean
      exact?: boolean
    } = {}
  ): this {
    if (!term || !columns.length) {
      return this
    }

    const { 
      caseSensitive = false, 
      wildcards = true, 
      exact = false 
    } = options

    const searchTerm = exact ? term : (wildcards ? `%${term}%` : term)
    const operator = exact ? '=' : (caseSensitive ? 'like' : 'ilike')

    const searchConditions = columns.map(column => {
      return this.buildCondition(column, operator, searchTerm)
    })

    this.queryBuilder = this.queryBuilder.where(or(...searchConditions))
    return this
  }

  // Relationships
  with(relations: string | string[]) {
    const relationsArray = Array.isArray(relations) ? relations : [relations]
    this.relations.push(...relationsArray)
    return this
  }

  // Ordering
  orderBy(column: string, direction: 'asc' | 'desc' = 'asc') {
	const tableColumn = (this.modelClass.table as any)[column]
	this.queryBuilder = this.queryBuilder.orderBy(
	  direction === 'desc' ? desc(tableColumn) : asc(tableColumn)
	)
	return this
  }

  latest(column = 'created_at') {
    return this.orderBy(column, 'desc')
  }

  oldest(column = 'created_at') {
    return this.orderBy(column, 'asc')
  }

  // Limiting
  limit(count: number) {
    this.queryBuilder = this.queryBuilder.limit(count)
    return this
  }

  offset(count: number) {
    this.queryBuilder = this.queryBuilder.offset(count)
    return this
  }

  take(count: number) {
    return this.limit(count)
  }

  skip(count: number) {
    return this.offset(count)
  }

  // Execution methods
  async get(): Promise<InstanceType<T>[]> {
    const results = await this.queryBuilder
	const models: InstanceType<T>[] = results.map((row: Record<string, any>) => this.newFromBuilder(row))
    
    if (this.relations.length > 0) {
      await RelationshipLoader.loadRelations(models, this.relations)
    }
    
    return models
  }

  async first(): Promise<InstanceType<T> | null> {
    const result = await this.limit(1).queryBuilder
    return result[0] ? this.newFromBuilder(result[0]) : null
  }

  async firstOrFail(): Promise<InstanceType<T>> {
    const result = await this.first()
    if (!result) {
      throw new Error(`No query results for model ${this.modelClass.name}`)
    }
    return result
  }

  async count(): Promise<number> {
    const result = await getDatabase()
      .select({ count: sql<number>`count(*)` })
      .from(this.modelClass.table)
    return result[0].count
  }

  async exists(): Promise<boolean> {
    const count = await this.count()
    return count > 0
  }

  // Aggregates
	async aggregate(aggregates: Record<string, { fn: 'count' | 'sum' | 'avg' | 'min' | 'max' , column?: string }>) {
		const selectObj: Record<string, SQL> = {}
		
		for (const [alias, config] of Object.entries(aggregates)) {
			const column = config.column ? (this.modelClass.table as any)[config.column] : undefined
			
			switch (config.fn) {
				case 'count':
					selectObj[alias] = column ? count(column) : count()
					break
				case 'sum':
					if (!column) throw new Error('Sum requires a column')
					selectObj[alias] = sum(column)
					break
				case 'avg':
					if (!column) throw new Error('Avg requires a column')
					selectObj[alias] = avg(column)
					break
				case 'min':
					if (!column) throw new Error('Min requires a column')
					selectObj[alias] = min(column)
					break
				case 'max':
					if (!column) throw new Error('Max requires a column')
					selectObj[alias] = max(column)
					break
			}
		}

		const result = await getDatabase()
			.select(selectObj)
			.from(this.modelClass.table)
		
		return result[0]
	}

	// Grouping and Having
	groupBy(...columns: string[]) {
		const tableColumns = columns.map(col => (this.modelClass.table as any)[col])
		this.groupByColumns.push(...tableColumns)
		this.queryBuilder = this.queryBuilder.groupBy(...tableColumns)
		return this
	}

	having(column: string, operator: string, value: any) {
		const condition = this.buildCondition(column, operator, value)
		this.havingConditions.push(condition)
		this.queryBuilder = this.queryBuilder.having(condition)
		return this
	}

	// Joins
	join(table: PgTable, firstColumn: string, operator: string, secondColumn: string) {
		this.queryBuilder = this.queryBuilder.innerJoin(
			table,
			eq((this.modelClass.table as any)[firstColumn], (table as any)[secondColumn])
		)
		return this
	}

	leftJoin(table: PgTable, firstColumn: string, operator: string, secondColumn: string) {
		this.queryBuilder = this.queryBuilder.leftJoin(
			table,
			eq((this.modelClass.table as any)[firstColumn], (table as any)[secondColumn])
		)
		return this
	}

  // Advanced where clauses
  whereBetween(column: string, values: [any, any]) {
	const tableColumn = (this.modelClass.table as any)[column]
	this.queryBuilder = this.queryBuilder.where(
	  and(gte(tableColumn, values[0]), lte(tableColumn, values[1]))
	)
	return this
  }

  whereNotBetween(column: string, values: [any, any]) {
	const tableColumn = (this.modelClass.table as any)[column]
	this.queryBuilder = this.queryBuilder.where(
	  or(lt(tableColumn, values[0]), gt(tableColumn, values[1]))
	)
	return this
  }

  // Raw SQL support
	whereRaw(sqlRaw: string) {
		this.queryBuilder = this.queryBuilder.where(sql.raw(sqlRaw))
		return this
	}

	selectRaw(expression: string, alias?: string) {
		const rawExpression = alias ? sql.raw(`${expression} as ${alias}`) : sql.raw(expression)
		this.queryBuilder = this.queryBuilder.select({ [alias || 'raw']: rawExpression })
		return this
	}

  // Enhanced pagination
	async paginate(perPage = 15, page = 1) {
		const offset = (page - 1) * perPage
		
		// Clone query for count
		const countQuery = getDatabase()
			.select({ count: count() })
			.from(this.modelClass.table)
		
		// Apply same where conditions to count query
		// This is simplified - in a real implementation, you'd need to track all conditions
		
		const [totalResult, data] = await Promise.all([
			countQuery,
			this.offset(offset).limit(perPage).get()
		])

		const total = totalResult[0].count
		const lastPage = Math.ceil(total / perPage)

		return {
			data,
			meta: {
				current_page: page,
				per_page: perPage,
				total,
				last_page: lastPage,
				from: offset + 1,
				to: Math.min(offset + perPage, total),
				has_more: page < lastPage,
				links: {
					first: 1,
					last: lastPage,
					prev: page > 1 ? page - 1 : null,
					next: page < lastPage ? page + 1 : null
				}
			}
		}
	}

	// Chunking for large datasets
	async chunk(size: number, callback: (models: InstanceType<T>[]) => Promise<void> | void) {
		let page = 1
		let hasMore = true

		while (hasMore) {
			const results = await this.offset((page - 1) * size).limit(size).get()
			
			if (results.length === 0) {
				hasMore = false
			} else {
				await callback(results)
				hasMore = results.length === size
				page++
			}
		}
	}

  private buildCondition(column: string, operator: string, value: any) {
	const tableColumn = (this.modelClass.table as any)[column]
	
	switch (operator) {
	  case '=':
	  case '==':
		return eq(tableColumn, value)
	  case '!=':
	  case '<>':
		return ne(tableColumn, value)
	  case '>':
		return gt(tableColumn, value)
	  case '>=':
		return gte(tableColumn, value)
	  case '<':
		return lt(tableColumn, value)
	  case '<=':
		return lte(tableColumn, value)
	  case 'like':
		return like(tableColumn, value)
	  case 'ilike':
		return ilike(tableColumn, value)
	  default:
		return eq(tableColumn, value)
	}
  }

  private newFromBuilder(attributes: Record<string, any>): InstanceType<T> {
	const instance = this.modelClass.fromAttributes(attributes) as InstanceType<T>
	instance.exists = true
	instance.isDirty = false
	
	// Use the public method if available, or cast to access private method
	if ('syncOriginal' in instance && typeof (instance as any).syncOriginal === 'function') {
	  (instance as any).syncOriginal()
	}
	return instance
  }
}