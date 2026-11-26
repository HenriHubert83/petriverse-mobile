import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import ts from 'typescript';

// Use the compiler's JSX whitespace rules. Trimming JSX text would hide the
// same-line space that caused Skia's reconciler to discard the whole dish.
function unsupportedChildren(source:string):string[]{
  const parsed=ts.createSourceFile('scene.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const components=new Set<string>(),namespaces=new Set<string>();
  for(const statement of parsed.statements){
    if(!ts.isImportDeclaration(statement)||!ts.isStringLiteral(statement.moduleSpecifier)||statement.moduleSpecifier.text!=='@shopify/react-native-skia')continue;
    const bindings=statement.importClause?.namedBindings;
    if(bindings&&ts.isNamedImports(bindings))for(const binding of bindings.elements)components.add(binding.name.text);
    if(bindings&&ts.isNamespaceImport(bindings))namespaces.add(bindings.name.text);
  }
  const emitted=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  const tree=ts.createSourceFile('scene.js',emitted,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const errors:string[]=[];
  const element=(node:ts.Node):node is ts.CallExpression=>ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='createElement';
  const isSkia=(tag:ts.Node)=>ts.isIdentifier(tag)?components.has(tag.text):ts.isPropertyAccessExpression(tag)&&ts.isIdentifier(tag.expression)&&namespaces.has(tag.expression.text);
  const inspect=(node:ts.Node,tag:string)=>{
    if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))&&node.text.length>0||ts.isNumericLiteral(node)){
      errors.push(`${tag}: ${node.getText(tree)}`);
    }else if(ts.isParenthesizedExpression(node))inspect(node.expression,tag);
    else if(ts.isArrayLiteralExpression(node))node.elements.forEach(child=>inspect(child,tag));
    else if(ts.isConditionalExpression(node)){inspect(node.whenTrue,tag);inspect(node.whenFalse,tag);}
    else if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken)inspect(node.right,tag);
    else if(element(node)&&node.arguments[0]?.getText(tree)==='React.Fragment')node.arguments.slice(2).forEach(child=>inspect(child,tag));
  };
  const visit=(node:ts.Node)=>{
    if(element(node)&&node.arguments[0]&&isSkia(node.arguments[0]))node.arguments.slice(2).forEach(child=>inspect(child,node.arguments[0].getText(tree)));
    ts.forEachChild(node,visit);
  };
  visit(tree);return errors;
}

test('Skia child guard rejects preserved JSX spaces, literal text and numbers',()=>{
  const source=`import {Group,Path,Points,Text as SkiaText} from '@shopify/react-native-skia';
    const a=<Group>{path&&<Path path={path}/>} {points.length>0&&<Points points={points}/>}</Group>;
    const b=<Group>{' '}{0}<>caption</></Group>;
    const c=<SkiaText text="Valid text prop"/>;`;
  assert.deepEqual(unsupportedChildren(source),['Group: " "','Group: \' \'','Group: 0','Group: "caption"']);
});

test('Skia child guard permits element-only groups and native text outside the canvas',()=>{
  const source=`import {Group as DrawingGroup,Path,Points,Text as SkiaText} from '@shopify/react-native-skia';
    import {Text} from 'react-native';
    const a=<DrawingGroup>
      {path.length>0&&<Path path={path}/>}
      {points.length>0&&<Points points={points}/>}
      <SkiaText text="A valid canvas label"/>
    </DrawingGroup>;
    const b=<Text>Score: {3} points</Text>;`;
  assert.deepEqual(unsupportedChildren(source),[]);
});

test('all app Skia groups compile without unsupported literal children',()=>{
  const root=join(process.cwd(),'src'),errors:string[]=[];
  let scenes=0;
  const scan=(directory:string)=>{
    for(const entry of readdirSync(directory,{withFileTypes:true})){
      const path=join(directory,entry.name);
      if(entry.isDirectory()){scan(path);continue;}
      if(!entry.name.endsWith('.tsx'))continue;
      const source=readFileSync(path,'utf8');if(!source.includes('@shopify/react-native-skia'))continue;
      scenes++;errors.push(...unsupportedChildren(source).map(error=>`${relative(root,path)}: ${error}`));
    }
  };
  scan(root);assert.ok(scenes>0);assert.deepEqual(errors,[]);
});
