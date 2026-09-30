import tseslint from 'typescript-eslint';
export default tseslint.config({ignores:['**/dist/**','work/**']},...tseslint.configs.recommended);
