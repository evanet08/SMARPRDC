"""
Custom middleware for SMARPRDC.
"""


class NoCacheHTMLMiddleware:
    """
    Adds Cache-Control: no-cache headers to all HTML responses
    to prevent browsers from serving stale dashboard pages.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        content_type = response.get('Content-Type', '')
        if 'text/html' in content_type:
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
        return response
