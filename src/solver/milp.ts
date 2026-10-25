// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
A decision variable, identified by its column in the model.
*/
export type Var = {
	readonly col: number;
};

/**
A variable, or a constant standing in for one whose value is known.
*/
export type Operand = Var | number;

export type Term = readonly [coefficient: number, operand: Operand];

type Row = {
	readonly cols: number[];
	readonly coefs: number[];
	readonly lower: number;
	readonly upper: number;
};

/**
Minimal builder for a mixed-integer linear program (minimisation).
Constants in expressions are folded into row bounds, so callers can write
constraints uniformly whether or not a quantity is already decided.
*/
export class MilpBuilder {
	readonly names: string[] = [];
	readonly cost: number[] = [];
	readonly lower: number[] = [];
	readonly upper: number[] = [];
	readonly integer: boolean[] = [];
	readonly rows: Row[] = [];

	private variable(
		name: string,
		{
			lower,
			upper,
			isInteger,
			cost,
		}: {lower: number; upper: number; isInteger: boolean; cost: number},
	): Var {
		const col = this.names.length;
		this.names.push(name);
		this.cost.push(cost);
		this.lower.push(lower);
		this.upper.push(upper);
		this.integer.push(isInteger);
		return {col};
	}

	binary(name: string, cost = 0): Var {
		return this.variable(name, {
			lower: 0, upper: 1, isInteger: true, cost,
		});
	}

	continuous(name: string, lower: number, upper: number, cost = 0): Var {
		return this.variable(name, {
			lower, upper, isInteger: false, cost,
		});
	}

	addCost(v: Operand, cost: number): void {
		if (typeof v !== 'number') {
			this.cost[v.col]! += cost;
		}
	}

	/**
	Adds `lower <= Σ terms <= upper`.
	*/
	constrain(terms: readonly Term[], lower: number, upper: number): void {
		const merged = new Map<number, number>();
		let constant = 0;
		for (const [k, v] of terms) {
			if (typeof v === 'number') {
				constant += k * v;
			} else {
				merged.set(v.col, (merged.get(v.col) ?? 0) + k);
			}
		}

		for (const [col, k] of merged) {
			if (k === 0) {
				merged.delete(col);
			}
		}

		lower -= constant;
		upper -= constant;
		if (merged.size === 0) {
			if (lower > 1e-9 || upper < -1e-9) {
				throw new Error(`Constant constraint cannot hold: ${lower} <= 0 <= ${upper}`);
			}

			return;
		}

		this.rows.push({
			cols: [...merged.keys()],
			coefs: [...merged.values()],
			lower,
			upper,
		});
	}

	atMost(terms: readonly Term[], upper: number): void {
		this.constrain(terms, -Infinity, upper);
	}

	atLeast(terms: readonly Term[], lower: number): void {
		this.constrain(terms, lower, Infinity);
	}

	equal(terms: readonly Term[], value: number): void {
		this.constrain(terms, value, value);
	}

	get columnCount(): number {
		return this.names.length;
	}

	/**
	Row-major sparse arrays, as accepted by HiGHS `createModel`.
	*/
	toArrays() {
		const starts = [0];
		const indices: number[] = [];
		const values: number[] = [];
		for (const row of this.rows) {
			indices.push(...row.cols);
			values.push(...row.coefs);
			starts.push(indices.length);
		}

		return {
			numCols: this.columnCount,
			numRows: this.rows.length,
			colCost: Float64Array.from(this.cost),
			colLower: Float64Array.from(this.lower),
			colUpper: Float64Array.from(this.upper),
			rowLower: Float64Array.from(this.rows, r => r.lower),
			rowUpper: Float64Array.from(this.rows, r => r.upper),
			integrality: Int32Array.from(this.integer, i => (i ? 1 : 0)),
			matrix: {
				format: 'csr' as const,
				numRows: this.rows.length,
				numCols: this.columnCount,
				starts: Int32Array.from(starts),
				indices: Int32Array.from(indices),
				values: Float64Array.from(values),
			},
		};
	}
}
