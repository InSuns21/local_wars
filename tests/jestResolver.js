const path = require('path');

const resolveAliasPath = (request, rootDir) => {
  if (request.startsWith('@/')) return path.join(rootDir, 'src', request.slice(2));
  if (request.startsWith('@core/')) return path.join(rootDir, 'src', 'core', request.slice('@core/'.length));
  if (request.startsWith('@store/')) return path.join(rootDir, 'src', 'store', request.slice('@store/'.length));
  if (request.startsWith('@components/')) return path.join(rootDir, 'src', 'components', request.slice('@components/'.length));
  if (request.startsWith('@hooks/')) return path.join(rootDir, 'src', 'hooks', request.slice('@hooks/'.length));
  if (request.startsWith('@data/')) return path.join(rootDir, 'src', 'data', request.slice('@data/'.length));
  if (request.startsWith('@services/')) return path.join(rootDir, 'src', 'services', request.slice('@services/'.length));
  if (request.startsWith('@utils/')) return path.join(rootDir, 'src', 'utils', request.slice('@utils/'.length));
  if (request.startsWith('@types/')) return path.join(rootDir, 'src', 'types', request.slice('@types/'.length));
  return null;
};

module.exports = (request, options) => {
  const aliased = resolveAliasPath(request, options.rootDir);
  if (aliased) {
    return options.defaultResolver(aliased, options);
  }
  return options.defaultResolver(request, options);
};
